import { supabase } from './supabase.js';

(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session && !window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
    window.location.href = 'index.html';
    return;
  }
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.style.display = 'inline-block';
    logoutBtn.onclick = async () => {
      await supabase.auth.signOut();
      window.location.href = 'index.html';
    };
  }
  if (session) {
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
    const adminLink = document.getElementById('adminLink');
    if (adminLink && profile?.is_admin) adminLink.style.display = 'inline';
  }
})();
