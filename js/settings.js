import { supabase } from './supabase.js';

let currentUser = null;
let pendingAvatarUrl = null;

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.replace('index.html'); return; }
  currentUser = session.user;

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
  if (profile) {
    document.getElementById('settingsUsername').value = profile.username || '';
    document.getElementById('settingsFullName').value = profile.full_name || '';
    document.getElementById('settingsBio').value = profile.bio || '';
    if (profile.avatar_url) {
      document.getElementById('currentAvatar').src = profile.avatar_url;
      pendingAvatarUrl = profile.avatar_url;
    }
  }
}

window.uploadAvatar = async (event) => {
  const file = event.target.files[0];
  if (!file || !currentUser) return;
  const msg = document.getElementById('settingsMsg');
  msg.textContent = 'Uploading photo...';
  msg.className = 'msg';
  const ext = file.name.split('.').pop();
  const path = `${currentUser.id}/avatar.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) { msg.textContent = error.message; msg.className = 'msg error'; return; }
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  pendingAvatarUrl = data.publicUrl;
  document.getElementById('currentAvatar').src = pendingAvatarUrl;
  msg.textContent = '✅ Photo ready — click Save Changes to apply.';
  msg.className = 'msg success';
};

window.saveProfile = async () => {
  const username = document.getElementById('settingsUsername').value.trim();
  const full_name = document.getElementById('settingsFullName').value.trim();
  const bio = document.getElementById('settingsBio').value.trim();
  const msg = document.getElementById('settingsMsg');

  if (username.length < 3) { msg.textContent = 'Username must be at least 3 characters.'; msg.className = 'msg error'; return; }

  msg.textContent = 'Saving...';
  msg.className = 'msg';

  const updates = { id: currentUser.id, username, full_name, bio, updated_at: new Date().toISOString() };
  if (pendingAvatarUrl) updates.avatar_url = pendingAvatarUrl;

  const { error } = await supabase.from('profiles').upsert(updates);
  if (error) { msg.textContent = error.message; msg.className = 'msg error'; return; }
  msg.textContent = '✅ Profile saved!';
  msg.className = 'msg success';
};

init();
