import { supabase } from './supabase.js';

const DEFAULT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#e4e6eb"/><circle cx="50" cy="38" r="18" fill="#bcc0c4"/><ellipse cx="50" cy="85" rx="30" ry="22" fill="#bcc0c4"/></svg>`);

let currentUser = null;

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.replace('index.html'); return; }
  currentUser = session.user;
  loadFeed();
}

window.submitPost = async () => {
  const caption = document.getElementById('postCaption').value.trim();
  const imageFile = document.getElementById('postImage').files[0];
  const msg = document.getElementById('postMsg');
  let image_url = null;

  msg.textContent = 'Posting...';
  msg.className = 'msg';

  if (imageFile) {
    const ext = imageFile.name.split('.').pop();
    const path = `${currentUser.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('post-images').upload(path, imageFile);
    if (upErr) { msg.textContent = upErr.message; msg.className = 'msg error'; return; }
    const { data } = supabase.storage.from('post-images').getPublicUrl(path);
    image_url = data.publicUrl;
  }

  if (!caption && !image_url) {
    msg.textContent = 'Add a caption or image to post.';
    msg.className = 'msg error';
    return;
  }

  const { error } = await supabase.from('posts').insert({ user_id: currentUser.id, caption, image_url });
  if (error) { msg.textContent = error.message; msg.className = 'msg error'; return; }
  document.getElementById('postCaption').value = '';
  document.getElementById('postImage').value = '';
  msg.textContent = '✅ Posted!';
  msg.className = 'msg success';
  loadFeed();
};

async function loadFeed() {
  const container = document.getElementById('feedContainer');
  container.innerHTML = '<p style="padding:16px">Loading feed...</p>';
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, profiles(username, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) { container.innerHTML = `<p class="msg error">${error.message}</p>`; return; }
  if (!posts.length) { container.innerHTML = '<p style="padding:16px;color:#888">No posts yet. Be the first!</p>'; return; }
  container.innerHTML = '';
  for (const post of posts) container.appendChild(await buildPostCard(post));
}

async function buildPostCard(post) {
  const { data: postLikes } = await supabase.from('likes').select('user_id').eq('post_id', post.id);
  const { data: comments } = await supabase
    .from('comments')
    .select('*, profiles(username), comment_likes(user_id)')
    .eq('post_id', post.id)
    .order('created_at');

  const liked = postLikes?.some(l => l.user_id === currentUser?.id);
  const avatar = post.profiles?.avatar_url || DEFAULT_AVATAR;
  const timeAgo = new Date(post.created_at).toLocaleDateString();

  const card = document.createElement('div');
  card.className = 'card post-card';
  card.id = `post-${post.id}`;

  const commentsHtml = (comments || []).map(c => {
    const cLiked = c.comment_likes?.some(l => l.user_id === currentUser?.id);
    const cLikeCount = c.comment_likes?.length || 0;
    return `<div class="comment-item" id="comment-${c.id}">
      <strong>${c.profiles?.username}:</strong> ${c.body}
      <button class="comment-like-btn${cLiked ? ' liked' : ''}" onclick="toggleCommentLike('${c.id}', ${cLiked})">
        ♥ <span id="clikes-${c.id}">${cLikeCount > 0 ? cLikeCount : ''}</span>
      </button>
    </div>`;
  }).join('');

  card.innerHTML = `
    <div class="post-header">
      <img src="${avatar}" alt="avatar" onerror="this.src='${DEFAULT_AVATAR}'" />
      <div>
        <div class="username"><a href="profile.html?u=${post.profiles?.username}" style="text-decoration:none;color:inherit">${post.profiles?.username || 'Unknown'}</a></div>
        <div class="time">${timeAgo}</div>
      </div>
    </div>
    ${post.image_url ? `<div class="post-image"><img src="${post.image_url}" alt="post" /></div>` : ''}
    ${post.caption ? `<div class="post-caption">${post.caption}</div>` : ''}
    <div class="post-actions">
      <button class="like-btn${liked ? ' liked' : ''}" onclick="toggleLike('${post.id}', ${liked})">❤️</button>
      <span class="like-count" id="likes-${post.id}">${postLikes?.length || 0} likes</span>
    </div>
    <div class="comments-section">
      <div id="comments-${post.id}">${commentsHtml}</div>
      <div class="comment-form">
        <input type="text" id="comment-input-${post.id}" placeholder="Add a comment..." onkeydown="if(event.key==='Enter')submitComment('${post.id}')" />
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
  const newLiked = likes?.some(l => l.user_id === currentUser.id);
  const btn = document.querySelector(`#post-${postId} .like-btn`);
  btn.className = `like-btn${newLiked ? ' liked' : ''}`;
  btn.setAttribute('onclick', `toggleLike('${postId}', ${newLiked})`);
  document.getElementById(`likes-${postId}`).textContent = `${likes?.length || 0} likes`;
};

window.toggleCommentLike = async (commentId, isLiked) => {
  if (!currentUser) return;
  if (isLiked) {
    await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', currentUser.id);
  } else {
    await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: currentUser.id });
  }
  const { data: likes } = await supabase.from('comment_likes').select('user_id').eq('comment_id', commentId);
  const newLiked = likes?.some(l => l.user_id === currentUser.id);
  const btn = document.querySelector(`#comment-${commentId} .comment-like-btn`);
  if (btn) {
    btn.className = `comment-like-btn${newLiked ? ' liked' : ''}`;
    btn.setAttribute('onclick', `toggleCommentLike('${commentId}', ${newLiked})`);
    const countEl = document.getElementById(`clikes-${commentId}`);
    if (countEl) countEl.textContent = likes?.length > 0 ? likes.length : '';
  }
};

window.submitComment = async (postId) => {
  const input = document.getElementById(`comment-input-${postId}`);
  const body = input.value.trim();
  if (!body || !currentUser) return;
  const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: currentUser.id, body });
  if (error) return;
  input.value = '';
  const { data: comments } = await supabase
    .from('comments')
    .select('*, profiles(username), comment_likes(user_id)')
    .eq('post_id', postId)
    .order('created_at');
  document.getElementById(`comments-${postId}`).innerHTML = (comments || []).map(c => {
    const cLiked = c.comment_likes?.some(l => l.user_id === currentUser?.id);
    const cLikeCount = c.comment_likes?.length || 0;
    return `<div class="comment-item" id="comment-${c.id}">
      <strong>${c.profiles?.username}:</strong> ${c.body}
      <button class="comment-like-btn${cLiked ? ' liked' : ''}" onclick="toggleCommentLike('${c.id}', ${cLiked})">
        ♥ <span id="clikes-${c.id}">${cLikeCount > 0 ? cLikeCount : ''}</span>
      </button>
    </div>`;
  }).join('');
};

init();
