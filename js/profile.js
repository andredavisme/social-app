import { supabase } from './supabase.js';

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.replace('index.html'); return; }

  const params = new URLSearchParams(window.location.search);
  const username = params.get('u');
  let profile;

  if (username) {
    const { data } = await supabase.from('profiles').select('*').eq('username', username).single();
    profile = data;
  } else {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    profile = data;
  }

  if (!profile) { document.getElementById('profileHeader').innerHTML = '<p>User not found.</p>'; return; }

  const { data: followers } = await supabase.from('follows').select('follower_id').eq('following_id', profile.id);
  const { data: following } = await supabase.from('follows').select('following_id').eq('follower_id', profile.id);
  const { data: posts } = await supabase.from('posts').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });

  const isMe = session.user.id === profile.id;
  const isFollowing = followers?.some(f => f.follower_id === session.user.id);

  document.getElementById('profileHeader').innerHTML = `
    <img src="${profile.avatar_url || 'https://placehold.co/90'}" alt="avatar" />
    <div class="profile-info">
      <h2>${profile.username}</h2>
      ${profile.full_name ? `<p>${profile.full_name}</p>` : ''}
      ${profile.bio ? `<p style="color:#555;margin-top:4px">${profile.bio}</p>` : ''}
      <div class="profile-stats">
        <div><span>${posts?.length || 0}</span> posts</div>
        <div><span>${followers?.length || 0}</span> followers</div>
        <div><span>${following?.length || 0}</span> following</div>
      </div>
      ${!isMe
        ? `<button class="follow-btn${isFollowing ? ' following' : ''}" onclick="toggleFollow('${profile.id}', ${isFollowing})">${isFollowing ? 'Unfollow' : 'Follow'}</button>
           <a href="messages.html?dm=${profile.id}"><button style="margin-left:8px">Message</button></a>`
        : '<a href="settings.html"><button style="margin-top:10px">Edit Profile</button></a>'}
    </div>`;

  const postsEl = document.getElementById('profilePosts');
  postsEl.innerHTML = '';
  for (const post of posts || []) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      ${post.image_url ? `<img src="${post.image_url}" style="width:100%;border-radius:8px;margin-bottom:8px;max-height:400px;object-fit:cover" />` : ''}
      <p>${post.caption || ''}</p>
      <small style="color:#888">${new Date(post.created_at).toLocaleDateString()}</small>`;
    postsEl.appendChild(card);
  }
}

window.toggleFollow = async (targetId, isFollowing) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  if (isFollowing) {
    await supabase.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', targetId);
  } else {
    await supabase.from('follows').insert({ follower_id: session.user.id, following_id: targetId });
  }
  init();
};

init();
