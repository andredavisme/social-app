import { supabase } from './supabase.js';

window.showTab = (tab) => {
  document.getElementById('loginTab').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('signupTab').style.display = tab === 'signup' ? 'block' : 'none';
  document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', (tab==='login'&&i===0)||(tab==='signup'&&i===1)));
};

window.login = async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const msg = document.getElementById('loginMsg');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { msg.textContent = error.message; return; }
  window.location.href = 'feed.html';
};

window.signup = async () => {
  const username = document.getElementById('signupUsername').value.trim();
  const full_name = document.getElementById('signupFullName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const msg = document.getElementById('signupMsg');
  if (username.length < 3) { msg.textContent = 'Username must be at least 3 characters.'; return; }
  const { error } = await supabase.auth.signUp({
    email, password,
    options: { data: { username, full_name } }
  });
  if (error) { msg.textContent = error.message; return; }
  msg.textContent = 'Account created! Check your email to confirm.';
  msg.className = 'msg success';
};

(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) window.location.href = 'feed.html';
})();
