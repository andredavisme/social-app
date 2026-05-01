import { supabase } from './supabase.js';

let currentUser = null;
let activeReceiverId = null;

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.replace('index.html'); return; }
  currentUser = session.user;
  loadConversations();

  // Support opening a DM directly from profile page
  const params = new URLSearchParams(window.location.search);
  const dmId = params.get('dm');
  if (dmId) {
    const { data: p } = await supabase.from('profiles').select('username').eq('id', dmId).single();
    if (p) openThread(dmId, p.username);
  }
}

async function loadConversations() {
  const { data: sent } = await supabase.from('messages').select('receiver_id').eq('sender_id', currentUser.id);
  const { data: received } = await supabase.from('messages').select('sender_id').eq('receiver_id', currentUser.id);
  const ids = new Set([
    ...(sent||[]).map(m => m.receiver_id),
    ...(received||[]).map(m => m.sender_id)
  ]);
  const list = document.getElementById('conversationList');
  list.innerHTML = '';
  for (const id of ids) {
    const { data: p } = await supabase.from('profiles').select('id, username, avatar_url').eq('id', id).single();
    if (!p) continue;
    const el = document.createElement('div');
    el.className = 'convo-item';
    el.innerHTML = `<img src="${p.avatar_url || 'https://placehold.co/36'}" /><span>${p.username}</span>`;
    el.onclick = () => openThread(p.id, p.username);
    list.appendChild(el);
  }
}

window.openThread = async function openThread(receiverId, username) {
  activeReceiverId = receiverId;
  document.getElementById('threadHeader').innerHTML = `<h3>💬 ${username}</h3>`;
  document.getElementById('replyBox').style.display = 'flex';
  const container = document.getElementById('threadMessages');
  const { data: msgs } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUser.id})`)
    .order('created_at');
  container.innerHTML = (msgs||[]).map(m =>
    `<div class="msg-bubble ${m.sender_id === currentUser.id ? 'sent' : 'received'}">${m.body}</div>`
  ).join('');
  container.scrollTop = container.scrollHeight;
};

window.sendMessage = async () => {
  const body = document.getElementById('dmBody').value.trim();
  if (!body || !activeReceiverId) return;
  await supabase.from('messages').insert({ sender_id: currentUser.id, receiver_id: activeReceiverId, body });
  document.getElementById('dmBody').value = '';
  const { data: p } = await supabase.from('profiles').select('username').eq('id', activeReceiverId).single();
  openThread(activeReceiverId, p?.username);
  loadConversations();
};

window.searchUsers = async () => {
  const q = document.getElementById('dmSearch').value.trim();
  const results = document.getElementById('userResults');
  if (!q) { results.innerHTML = ''; return; }
  const { data: users } = await supabase.from('profiles').select('id, username, avatar_url').ilike('username', `%${q}%`).neq('id', currentUser.id).limit(5);
  results.innerHTML = '';
  for (const u of users || []) {
    const el = document.createElement('div');
    el.className = 'convo-item';
    el.innerHTML = `<img src="${u.avatar_url || 'https://placehold.co/36'}" /><span>${u.username}</span>`;
    el.onclick = () => { document.getElementById('dmSearch').value = ''; results.innerHTML = ''; openThread(u.id, u.username); };
    results.appendChild(el);
  }
};

init();
