import { supabase } from './supabase.js';

let currentUser = null;

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }
  currentUser = session.user;
  loadFeed();
}

window.submitPost = async () => {
  const caption = document.getElementById('postCaption').value.trim();
  const imageFile = document.getElementById('postImage').files[0];
  const msg = document.getElementById('postMsg');
  let image_url = null;
  if (imageFile) {
    const ext = imageFile.name.split('.').pop();
    const path = `${currentUser.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('post-images').upload(path, imageFile);
    if (upErr) { msg.textContent = upErr.message; return; }
    const { data } = supabase.storage.from('post-images').getPublicUrl(path);
    image_url = data.publicUrl;
  }
  const { error } = await supabase.from('posts').insert({ user_id: currentUser.id, caption, image_url });
  if (error) { msg.textContent = error.message; return; }
  document.getElementById('postCaption').value = '';
  document.getElementById('postImage').value = '';
  msg.textContent = 'Posted!';
  msg.className = 'msg success';
  loadFeed();
};

async function loadFeed() {
  const container = document.getElementById('feedContainer');
  container.innerHTML = '<p>Loading...</p>';
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, profiles(username, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) { container.innerHTML = `<p>${error.message}</p>`; return; }
  container.innerHTML = '';
  for (const post of posts) {
    container.appendChild(await buildPostCard(post));
  }
}

async function buildPostCard(post) {
  const { data: likes } = await supabase.from('likes').select('user_id').eq('post_id', post.id);
  const { data: comments } = await supabase.from('comments').select('*, profiles(username)').eq('post_id', post.id).order('created_at');
  const liked = likes?.some(l => l.user_id === currentUser?.id);
  const avatar = post.profiles?.avatar_url || 'https://via.placeholder.com/40';
  const timeAgo = new Date(post.created_at).toLocaleDateString();

  const card = document.createElement('div');
  card.className = 'card post-card';
  card.id = `post-${post.id}`;
  card.innerHTML = `
    <div class="post-header">
      <img src="${avatar}" alt="avatar" />
      <div><div class="username">${post.profiles?.username || 'Unknown'}</div><div class="time">${timeAgo}</div></div>
    </div>
    ${post.image_url ? `<div class="post-image"><img src="${post.image_url}" alt="post" /></div>` : ''}
    ${post.caption ? `<div class="post-caption">${post.caption}</div>` : ''}
    <div class="post-actions">
      <button class="like-btn${liked ? ' liked' : ''}" onclick="toggleLike('${post.id}', ${liked})">❤️</button>
      <span class="like-count" id="likes-${post.id}">${likes?.length || 0} likes</span>
    </div>
    <div class="comments-section">
      ${(comments||[]).map(c => `<div class="comment-item"><strong>${c.profiles?.username}:</strong> ${c.body}</div>`).join('')}
      <div class="comment-form">
        <input type="text" id="comment-input-${post.id}" placeholder="Add a comment..." />
        <button onclick="submitComment('${post.id}')">Post</button>
      </div>
    </div>`;
  return card;
}

window.toggleLike = async (postId, isLiked) => {
  if (!currentUser) return;
  if (isLiked) {
    await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
  } else {
    await supabase.from('likes').insert({ post_id: postId, user_id: currentUser.id });
  }
  const { data: likes } = await supabase.from('likes').select('user_id').eq('post_id', postId);
  const btn = document.querySelector(`#post-${postId} .like-btn`);
  const newLiked = likes?.some(l => l.user_id === currentUser.id);
  btn.className = `like-btn${newLiked ? ' liked' : ''}`;
  btn.setAttribute('onclick', `toggleLike('${postId}', ${newLiked})`);
  document.getElementById(`likes-${postId}`).textContent = `${likes?.length || 0} likes`;
};

window.submitComment = async (postId) => {
  const input = document.getElementById(`comment-input-${postId}`);
  const body = input.value.trim();
  if (!body || !currentUser) return;
  await supabase.from('comments').insert({ post_id: postId, user_id: currentUser.id, body });
  input.value = '';
  loadFeed();
};

init();
