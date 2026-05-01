import { supabase } from './supabase.js';

let currentUser = null;
let currentProfile = null;

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }
  currentUser = session.user;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
  currentProfile = profile;
  if (profile) {
    document.getElementById('settingsUsername').value = profile.username || '';
    document.getElementById('settingsFullName').value = profile.full_name || '';
    document.getElementById('settingsBio').value = profile.bio || '';
    if (profile.avatar_url) document.getElementById('currentAvatar').src = profile.avatar_url;
  }
}

window.uploadAvatar = async (event) => {
  const file = event.target.files[0];
  if (!file || !currentUser) return;
  const ext = file.name.split('.').pop();
  const path = `${currentUser.id}/avatar.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) { document.getElementById('settingsMsg').textContent = error.message; return; }
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  currentProfile.avatar_url = data.publicUrl;
  document.getElementById('currentAvatar').src = data.publicUrl;
  document.getElementById('settingsMsg').textContent = 'Photo updated!';
  document.getElementById('settingsMsg').className = 'msg success';
};

window.saveProfile = async () => {
  const username = document.getElementById('settingsUsername').value.trim();
  const full_name = document.getElementById('settingsFullName').value.trim();
  const bio = document.getElementById('settingsBio').value.trim();
  const msg = document.getElementById('settingsMsg');
  if (username.length < 3) { msg.textContent = 'Username must be at least 3 characters.'; return; }
  const updates = { id: currentUser.id, username, full_name, bio, updated_at: new Date().toISOString() };
  if (currentProfile?.avatar_url) updates.avatar_url = currentProfile.avatar_url;
  const { error } = await supabase.from('profiles').upsert(updates);
  if (error) { msg.textContent = error.message; return; }
  msg.textContent = 'Profile saved!';
  msg.className = 'msg success';
};

init();
