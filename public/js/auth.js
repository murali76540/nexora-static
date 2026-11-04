/**
 * NEXORA Authentication Frontend Logic
 * E.G.S. Pillay Engineering College
 */

document.addEventListener('DOMContentLoaded', () => {
  initLoginTabs();
  initPasswordToggles();
  initLoginForm();
  initRegisterForm();
});

// Tab Switching for Unified Login Page
function initLoginTabs() {
  const tabs = document.querySelectorAll('.auth-tab-btn');
  const panes = document.querySelectorAll('.auth-tab-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPane = document.getElementById(tab.getAttribute('data-target'));
      if (targetPane) {
        targetPane.classList.add('active');
      }
    });
  });
}

// Password Visibility Toggles
function initPasswordToggles() {
  const toggles = document.querySelectorAll('.password-toggle-btn');
  toggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.innerHTML = isPassword ? '👁️‍🗨️' : '👁️';
      }
    });
  });
}

// Login Submission Handler (3 Methods)
function initLoginForm() {
  // Method 1: Member Login
  const memberForm = document.getElementById('memberLoginForm');
  if (memberForm) {
    memberForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = memberForm.querySelector('button[type="submit"]');
      const errorDiv = document.getElementById('memberLoginError');
      errorDiv.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating...';

      const email = document.getElementById('memberEmail').value;
      const password = document.getElementById('memberPassword').value;

      try {
        const res = await NexoraAPI.request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        NexoraAPI.setSession(res.sessionToken, res.user);
        showToast('Login successful! Welcome to Member Dashboard.', 'success');
        setTimeout(() => {
          window.location.href = res.redirectUrl || '/dashboard.html?tab=member';
        }, 500);
      } catch (err) {
        errorDiv.textContent = err.message || 'Authentication failed.';
        showToast(err.message || 'Login failed.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In to Member Dashboard';
      }
    });
  }

  // Method 2: Organizer Access
  const organizerForm = document.getElementById('organizerLoginForm');
  if (organizerForm) {
    organizerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = organizerForm.querySelector('button[type="submit"]');
      const errorDiv = document.getElementById('organizerLoginError');
      errorDiv.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying Key...';

      const organizerId = document.getElementById('organizerId').value;
      const accessKey = document.getElementById('organizerKey').value;

      try {
        const res = await NexoraAPI.request('/auth/organizer-access', {
          method: 'POST',
          body: JSON.stringify({ organizerId, accessKey })
        });
        NexoraAPI.setSession(res.sessionToken, res.user);
        showToast('Organizer access granted.', 'success');
        setTimeout(() => {
          window.location.href = res.redirectUrl || '/dashboard.html?tab=organizer';
        }, 500);
      } catch (err) {
        errorDiv.textContent = err.message || 'Invalid Organizer Access Key.';
        showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Unlock Organizer Dashboard';
      }
    });
  }

  // Method 3: Admin Access
  const adminForm = document.getElementById('adminLoginForm');
  if (adminForm) {
    adminForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = adminForm.querySelector('button[type="submit"]');
      const errorDiv = document.getElementById('adminLoginError');
      errorDiv.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying Key...';

      const adminId = document.getElementById('adminId').value;
      const accessKey = document.getElementById('adminKey').value;

      try {
        const res = await NexoraAPI.request('/auth/admin-access', {
          method: 'POST',
          body: JSON.stringify({ adminId, accessKey })
        });
        NexoraAPI.setSession(res.sessionToken, res.user);
        showToast('Administrator access granted.', 'success');
        setTimeout(() => {
          window.location.href = res.redirectUrl || '/dashboard.html?tab=admin';
        }, 500);
      } catch (err) {
        errorDiv.textContent = err.message || 'Invalid Administrator Access Key.';
        showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Unlock Administrator Dashboard';
      }
    });
  }
}

// Member-Only Registration Handler
function initRegisterForm() {
  const regForm = document.getElementById('memberRegisterForm');
  if (!regForm) return;

  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = regForm.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('registerError');
    errorDiv.textContent = '';

    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const department = document.getElementById('regDepartment').value;
    const academicYear = document.getElementById('regAcademicYear').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    // Strict Institutional Email check
    if (!email.endsWith('@egspec.edu')) {
      errorDiv.textContent = 'Only @egspec.edu email addresses are permitted for member registration.';
      showToast('Registration restricted to @egspec.edu domain.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      errorDiv.textContent = 'Passwords do not match.';
      return;
    }

    if (password.length < 6) {
      errorDiv.textContent = 'Password must be at least 6 characters long.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Member Account...';

    try {
      const res = await NexoraAPI.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          department,
          academicYear,
          password,
          confirmPassword
        })
      });

      NexoraAPI.setSession(res.sessionToken, res.user);
      showToast('Registration complete! Enrolled as Member.', 'success');
      setTimeout(() => {
        window.location.href = res.redirectUrl || '/dashboard.html?tab=member';
      }, 500);
    } catch (err) {
      errorDiv.textContent = err.message || 'Registration failed.';
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Complete Member Registration';
    }
  });
}
