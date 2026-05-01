import { supabase } from './supabase.js';

(async () => {
  const { data: { session } } = await supabase.auth.getSession();

  // Hard redirect to login if no session on any protected page
  if (!session) {
    window.location.replace('index.html');
    return;
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.style.display = 'inline-block';
    logoutBtn.onclick = async () => {
      await supabase.auth.signOut();
      window.location.replace('index.html');
    };
  }

  // Show admin link if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();

  const adminLink = document.getElementById('adminLink');
  if (adminLink && profile?.is_admin) adminLink.style.display = 'inline';
})();
