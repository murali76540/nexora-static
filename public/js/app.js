/**
 * NEXORA Main Application Controller
 * E.G.S. Pillay Engineering College
 */

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initMobileMenu();
  renderAuthState();
});

// Theme Management (Dark / Light)
function initThemeToggle() {
  const savedTheme = localStorage.getItem('nexora_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  const toggleButtons = document.querySelectorAll('.theme-toggle-btn');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('nexora_theme', nextTheme);
      showToast(`Switched to ${nextTheme} mode`, 'info');
    });
  });
}

// Mobile Menu Navigation
function initMobileMenu() {
  const toggle = document.querySelector('.mobile-menu-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });
  }
}

// Update Topbar Navigation based on active session
function renderAuthState() {
  const user = NexoraAPI.getUser();
  const authContainer = document.getElementById('navAuthActions');
  if (!authContainer) return;

  if (user) {
    let dashboardParam = 'member';
    if (user.role === 'organizer') dashboardParam = 'organizer';
    if (user.role === 'admin') dashboardParam = 'admin';

    authContainer.innerHTML = `
      <a href="/dashboard.html?tab=${dashboardParam}" class="btn btn-outline btn-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
        ${user.role.toUpperCase()} DASHBOARD
      </a>
      <button onclick="handleLogout()" class="btn btn-secondary btn-sm">Logout</button>
    `;
  } else {
    authContainer.innerHTML = `
      <a href="/login.html" class="btn btn-outline btn-sm">Login</a>
      <a href="/register.html" class="btn btn-primary btn-sm">Join Competition</a>
    `;
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

// Global Logout Handler
async function handleLogout() {
  try {
    await NexoraAPI.request('/auth/logout', { method: 'POST' });
  } catch (e) {
    // Session destroyed regardless
  }
  NexoraAPI.clearSession();
  showToast('Logged out. Protected dashboards re-locked.', 'info');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 600);
}

window.showToast = showToast;
window.handleLogout = handleLogout;
