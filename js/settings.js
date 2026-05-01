import { supabase } from './supabase.js';

let currentUser = null;
let pendingAvatarUrl = null;
let originalAvatarUrl = null;

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.replace('index.html'); return; }
  currentUser = session.user;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (profile) {
    document.getElementById('settingsUsername').value = profile.username || '';
    document.getElementById('settingsFullName').value = profile.full_name || '';
    document.getElementById('settingsBio').value = profile.bio || '';
    originalAvatarUrl = profile.avatar_url || null;
    pendingAvatarUrl = originalAvatarUrl;
    updateAvatarPreview();
  }
}

function updateAvatarPreview() {
  const img = document.getElementById('currentAvatar');
  const removeBtn = document.getElementById('removePhotoBtn');
  if (pendingAvatarUrl) {
    img.src = pendingAvatarUrl;
    removeBtn.style.display = 'inline-block';
  } else {
    img.src = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#e4e6eb"/><circle cx="50" cy="38" r="18" fill="#bcc0c4"/><ellipse cx="50" cy="85" rx="30" ry="22" fill="#bcc0c4"/></svg>`);
    removeBtn.style.display = 'none';
  }
}

window.uploadAvatar = async (event) => {
  const file = event.target.files[0];
  if (!file || !currentUser) return;
  const msg = document.getElementById('settingsMsg');
  msg.textContent = 'Uploading photo...';
  msg.className = 'msg';

  const ext = file.name.split('.').pop().toLowerCase();
  // Always use the same path so upsert works reliably
  const path = `${currentUser.id}/avatar.${ext}`;

  // Remove old avatar file first if it exists with a different extension
  const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  for (const e of extensions) {
    if (e !== ext) {
      await supabase.storage.from('avatars').remove([`${currentUser.id}/avatar.${e}`]);
    }
  }

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, cacheControl: '1' });

  if (error) {
    msg.textContent = error.message;
    msg.className = 'msg error';
    return;
  }

  // Bust cache by appending a timestamp
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  pendingAvatarUrl = data.publicUrl + '?t=' + Date.now();
  updateAvatarPreview();
  msg.textContent = '✅ Photo ready — click Save Changes to apply.';
  msg.className = 'msg success';
  // Reset file input so same file can be re-selected if needed
  event.target.value = '';
};

window.removePhoto = () => {
  pendingAvatarUrl = null;
  updateAvatarPreview();
  const msg = document.getElementById('settingsMsg');
  msg.textContent = 'Photo removed — click Save Changes to apply.';
  msg.className = 'msg';
};

window.saveProfile = async () => {
  const username = document.getElementById('settingsUsername').value.trim();
  const full_name = document.getElementById('settingsFullName').value.trim();
  const bio = document.getElementById('settingsBio').value.trim();
  const msg = document.getElementById('settingsMsg');

  if (username.length < 3) {
    msg.textContent = 'Username must be at least 3 characters.';
    msg.className = 'msg error';
    return;
  }

  // Check username uniqueness (skip if unchanged)
  const { data: original } = await supabase.from('profiles').select('username').eq('id', currentUser.id).single();
  if (username !== original?.username) {
    const { data: taken } = await supabase.from('profiles').select('username').eq('username', username).maybeSingle();
    if (taken) {
      msg.textContent = `Username "${username}" is already taken.`;
      msg.className = 'msg error';
      return;
    }
  }

  msg.textContent = 'Saving...';
  msg.className = 'msg';

  const updates = {
    id: currentUser.id,
    username,
    full_name,
    bio,
    avatar_url: pendingAvatarUrl,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('profiles').upsert(updates);
  if (error) {
    msg.textContent = error.message;
    msg.className = 'msg error';
    return;
  }

  originalAvatarUrl = pendingAvatarUrl;
  msg.textContent = '✅ Profile saved!';
  msg.className = 'msg success';
};

init();
