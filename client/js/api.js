const API_BASE = 'http://localhost:5003/api';

function isAuthPage() {
  return window.location.pathname.includes('index.html') ||
    window.location.pathname.includes('register.html') ||
    window.location.pathname === '/' ||
    window.location.pathname.endsWith('client/');
}

function getHeaders(isFormData = false) {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';
  return headers;
}

async function apiCall(endpoint, method = 'GET', data = null, isFormData = false) {
  const options = { method, headers: getHeaders(isFormData) };
  if (data) options.body = isFormData ? data : JSON.stringify(data);
  
  const res = await fetch(`${API_BASE}${endpoint}`, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'API Error');
  return json;
}

function saveSession(token, user = null) {
  localStorage.setItem('token', token);
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch (_err) {
    return null;
  }
}

function getDisplayName(user) {
  if (!user) return '';
  return user.name || user.email || 'Account';
}

function getAvatarLabel(user) {
  const displayName = getDisplayName(user).trim();
  return displayName ? displayName.charAt(0).toUpperCase() : 'A';
}

function renderUserNav(user) {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions || !user) return;

  navActions.innerHTML = `
    <div class="nav-user-menu">
      <button class="nav-user-trigger" type="button" aria-label="${getDisplayName(user)} account menu" aria-expanded="false">
        <div class="nav-avatar">${getAvatarLabel(user)}</div>
      </button>
      <div class="nav-user-dropdown">
        <button type="button" onclick="logout()">Logout</button>
      </div>
    </div>
  `;

  const trigger = navActions.querySelector('.nav-user-trigger');
  const menu = navActions.querySelector('.nav-user-menu');
  if (!trigger || !menu) return;

  const closeMenu = () => {
    menu.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  };

  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = !menu.classList.contains('open');
    document.querySelectorAll('.nav-user-menu.open').forEach((openMenu) => {
      openMenu.classList.remove('open');
      const openTrigger = openMenu.querySelector('.nav-user-trigger');
      if (openTrigger) {
        openTrigger.setAttribute('aria-expanded', 'false');
      }
    });
    if (willOpen) {
      menu.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    } else {
      closeMenu();
    }
  });

  document.addEventListener('click', (event) => {
    if (!menu.contains(event.target)) {
      closeMenu();
    }
  });
}

async function loadCurrentUser(forceRefresh = false) {
  const token = localStorage.getItem('token');
  if (!token) return null;

  const cachedUser = getStoredUser();
  if (cachedUser && !forceRefresh) {
    return cachedUser;
  }

  try {
    const res = await apiCall('/auth/profile');
    const user = res.data.user;
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  } catch (_err) {
    return cachedUser;
  }
}

async function initUserNav() {
  if (isAuthPage()) return;

  const cachedUser = getStoredUser();
  if (cachedUser) {
    renderUserNav(cachedUser);
    return;
  }

  const user = await loadCurrentUser(false);
  if (user) {
    renderUserNav(user);
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

function checkAuth() {
  if (!localStorage.getItem('token') && !isAuthPage()) {
    window.location.href = 'index.html';
  }
}
checkAuth();
initUserNav();
