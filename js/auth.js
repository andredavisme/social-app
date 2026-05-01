import { supabase } from './supabase.js';

// If already logged in, redirect to feed with a brief notice
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const banner = document.getElementById('alreadyLoggedIn');
    if (banner) {
      banner.style.display = 'block';
      // Give them 3 seconds to see the notice before redirecting
      setTimeout(() => { window.location.href = 'feed.html'; }, 3000);
    } else {
      window.location.href = 'feed.html';
    }
  }
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

  if (!email || !password) {
    msg.textContent = 'Please enter your email and password.';
    msg.className = 'msg error';
    return;
  }

  msg.textContent = 'Signing in...';
  msg.className = 'msg';

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.includes('Email not confirmed')) {
      msg.innerHTML = '📧 Your email hasn\'t been confirmed yet.<br/>Check your inbox (and spam folder) for a confirmation link.';
    } else if (error.message.includes('Invalid login credentials')) {
      msg.textContent = 'Incorrect email or password. Please try again.';
    } else {
      msg.textContent = error.message;
    }
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
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    msg.textContent = 'Username can only contain letters, numbers, and underscores.';
    msg.className = 'msg error';
    return;
  }
  if (!email.includes('@')) {
    msg.textContent = 'Please enter a valid email address.';
    msg.className = 'msg error';
    return;
  }
  if (password.length < 6) {
    msg.textContent = 'Password must be at least 6 characters.';
    msg.className = 'msg error';
    return;
  }

  msg.textContent = 'Checking availability...';
  msg.className = 'msg';

  const { data: existingUser } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .maybeSingle();

  if (existingUser) {
    msg.textContent = `The username "${username}" is already taken. Please choose another.`;
    msg.className = 'msg error';
    return;
  }

  msg.textContent = 'Creating account...';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, full_name } }
  });

  if (error) {
    if (
      error.message.toLowerCase().includes('already registered') ||
      error.message.toLowerCase().includes('already exists') ||
      error.message.toLowerCase().includes('user already')
    ) {
      msg.innerHTML = 'An account with that email already exists.<br/>Please <a href="#" onclick="showTab(\'login\')" style="color:#1877f2">log in</a> instead.';
    } else {
      msg.textContent = error.message;
    }
    msg.className = 'msg error';
    return;
  }

  if (data.user && data.user.identities && data.user.identities.length === 0) {
    msg.innerHTML = 'An account with that email already exists.<br/>Please <a href="#" onclick="showTab(\'login\')" style="color:#1877f2">log in</a> instead.';
    msg.className = 'msg error';
    return;
  }

  document.getElementById('signupTab').innerHTML = `
    <div class="confirm-box">
      <div style="font-size:2.5rem;margin-bottom:12px">📧</div>
      <h3 style="margin-bottom:8px">Check your email!</h3>
      <p>We sent a confirmation link to:</p>
      <p style="font-weight:700;margin:8px 0;color:#1877f2">${email}</p>
      <p style="color:#666;font-size:.9rem">Click the link in that email to activate your account, then come back and log in.</p>
      <p style="color:#888;font-size:.85rem;margin-top:12px">Don't see it? Check your spam folder.</p>
      <button onclick="showTab('login')" style="margin-top:16px">Go to Login</button>
    </div>`;
};
