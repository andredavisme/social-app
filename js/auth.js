import { supabase } from './supabase.js';

// If already logged in, skip to feed
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) window.location.href = 'feed.html';
})();

window.showTab = (tab) => {
  document.getElementById('loginTab').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('signupTab').style.display = tab === 'signup' ? 'block' : 'none';
  document.querySelectorAll('#authTabs .tab-btn').forEach((b, i) => {
    b.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'signup' && i === 1));
  });
};

window.login = async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const msg = document.getElementById('loginMsg');
  msg.textContent = 'Signing in...';
  msg.className = 'msg';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    msg.textContent = error.message;
    msg.className = 'msg error';
    return;
  }
  window.location.href = 'feed.html';
};

window.signup = async () => {
  const username = document.getElementById('signupUsername').value.trim();
  const full_name = document.getElementById('signupFullName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const msg = document.getElementById('signupMsg');

  if (username.length < 3) {
    msg.textContent = 'Username must be at least 3 characters.';
    msg.className = 'msg error';
    return;
  }
  if (password.length < 6) {
    msg.textContent = 'Password must be at least 6 characters.';
    msg.className = 'msg error';
    return;
  }

  msg.textContent = 'Creating account...';
  msg.className = 'msg';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, full_name } }
  });

  if (error) {
    msg.textContent = error.message;
    msg.className = 'msg error';
    return;
  }

  // Supabase may auto-confirm in dev mode — check for session
  if (data.session) {
    window.location.href = 'feed.html';
  } else {
    msg.textContent = '✅ Account created! Check your email to confirm, then log in.';
    msg.className = 'msg success';
  }
};
