import { supabase } from './supabase.js';

let currentUser = null;
let activeReceiverId = null;

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }
  currentUser = session.user;
  loadConversations();
}

async function loadConversations() {
  const { data: msgs } = await supabase
    .from('messages')
    .select('sender_id, receiver_id, profiles!messages_sender_id_fkey(username, avatar_url)')
    .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
    .order('created_at', { ascending: false });

  const seen = new Set();
  const list = document.getElementById('conversationList');
  list.innerHTML = '';
  for (const m of msgs || []) {
    const otherId = m.sender_id === currentUser.id ? m.receiver_id : m.sender_id;
    if (seen.has(otherId)) continue;
    seen.add(otherId);
    const { data: p } = await supabase.from('profiles').select('username, avatar_url').eq('id', otherId).single();
    if (!p) continue;
    const el = document.createElement('div');
    el.className = 'convo-item';
    el.innerHTML = `<img src="${p.avatar_url || 'https://via.placeholder.com/36'}" /><span>${p.username}</span>`;
    el.onclick = () => openThread(otherId, p.username);
    list.appendChild(el);
  }
}

async function openThread(receiverId, username) {
  activeReceiverId = receiverId;
  document.getElementById('threadHeader').innerHTML = `<h3>💬 ${username}</h3>`;
  document.getElementById('replyBox').style.display = 'flex';
  const container = document.getElementById('threadMessages');
  const { data: msgs } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUser.id})`)
    .order('created_at');
  container.innerHTML = '';
  for (const m of msgs || []) {
    const div = document.createElement('div');
    div.className = `msg-bubble ${m.sender_id === currentUser.id ? 'sent' : 'received'}`;
    div.textContent = m.body;
    container.appendChild(div);
  }
  container.scrollTop = container.scrollHeight;
}

window.sendMessage = async () => {
  const body = document.getElementById('dmBody').value.trim();
  if (!body || !activeReceiverId) return;
  await supabase.from('messages').insert({ sender_id: currentUser.id, receiver_id: activeReceiverId, body });
  document.getElementById('dmBody').value = '';
  const { data: p } = await supabase.from('profiles').select('username').eq('id', activeReceiverId).single();
  openThread(activeReceiverId, p?.username);
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
    el.innerHTML = `<img src="${u.avatar_url || 'https://via.placeholder.com/36'}" /><span>${u.username}</span>`;
    el.onclick = () => { document.getElementById('dmSearch').value = ''; results.innerHTML = ''; openThread(u.id, u.username); };
    results.appendChild(el);
  }
};

init();
