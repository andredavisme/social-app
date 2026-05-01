import { supabase } from './supabase.js';

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.replace('index.html'); return; }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
  if (!profile?.is_admin) { window.location.replace('feed.html'); return; }
  loadUsers();
}

window.adminTab = (tab) => {
  document.getElementById('adminUsers').style.display = tab === 'users' ? 'block' : 'none';
  document.getElementById('adminPosts').style.display = tab === 'posts' ? 'block' : 'none';
  document.getElementById('adminMessages').style.display = tab === 'messages' ? 'block' : 'none';
  document.querySelectorAll('.admin-tabs .tab-btn').forEach((b, i) =>
    b.classList.toggle('active', ['users','posts','messages'].indexOf(tab) === i)
  );
  if (tab === 'posts') loadPosts();
  if (tab === 'messages') loadMessages();
};

async function loadUsers() {
  const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  const list = document.getElementById('userList');
  list.innerHTML = '';
  for (const u of users || []) {
    const row = document.createElement('div');
    row.className = 'admin-user-row';
    row.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <img src="${u.avatar_url || 'https://placehold.co/36'}" style="width:36px;height:36px;border-radius:50%" />
        <div><strong>${u.username}</strong><br/><small>${u.full_name || ''} ${u.is_admin ? '🛡️ Admin' : ''}</small></div>
      </div>
      <button class="ban-btn" onclick="toggleAdmin('${u.id}', ${u.is_admin})">${u.is_admin ? 'Revoke Admin' : 'Make Admin'}</button>`;
    list.appendChild(row);
  }
}

window.toggleAdmin = async (userId, isAdmin) => {
  await supabase.from('profiles').update({ is_admin: !isAdmin }).eq('id', userId);
  loadUsers();
};

async function loadPosts() {
  const { data: posts } = await supabase.from('posts').select('*, profiles(username)').order('created_at', { ascending: false });
  const list = document.getElementById('postList');
  list.innerHTML = '';
  for (const p of posts || []) {
    const row = document.createElement('div');
    row.className = 'admin-post-row';
    row.innerHTML = `
      <div><strong>${p.profiles?.username}</strong>: ${p.caption || '[image only]'}<br/><small>${new Date(p.created_at).toLocaleString()}</small></div>
      <button class="delete-btn" onclick="deletePost('${p.id}')">Delete</button>`;
    list.appendChild(row);
  }
}

window.deletePost = async (postId) => {
  await supabase.from('posts').delete().eq('id', postId);
  loadPosts();
};

async function loadMessages() {
  const { data: msgs } = await supabase
    .from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(username), receiver:profiles!messages_receiver_id_fkey(username)')
    .order('created_at', { ascending: false })
    .limit(50);
  const list = document.getElementById('messageList');
  list.innerHTML = '';
  for (const m of msgs || []) {
    const row = document.createElement('div');
    row.className = 'admin-msg-row';
    row.innerHTML = `
      <div><strong>${m.sender?.username}</strong> → <strong>${m.receiver?.username}</strong>: ${m.body}<br/><small>${new Date(m.created_at).toLocaleString()}</small></div>
      <button class="delete-btn" onclick="deleteMessage('${m.id}')">Delete</button>`;
    list.appendChild(row);
  }
}

window.deleteMessage = async (msgId) => {
  await supabase.from('messages').delete().eq('id', msgId);
  loadMessages();
};

init();
