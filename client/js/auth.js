async function handleGoogleLogin(response) {
  try {
    const res = await apiCall('/auth/google', 'POST', { id_token: response.credential });
    saveSession(res.data.token, res.data.user);
    window.location.replace('dashboard.html');
  } catch (err) { alert('Google Login Failed: ' + err.message); }
}

if(document.getElementById('loginForm')) {
  document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiCall('/auth/login', 'POST', {
        email: e.target.email.value,
        password: e.target.password.value
      });
      saveSession(res.data.token, res.data.user);
      window.location.replace('dashboard.html');
    } catch (err) { alert(err.message); }
  };
}

if(document.getElementById('registerForm')) {
  document.getElementById('registerForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiCall('/auth/register', 'POST', {
        name: e.target.name.value,
        email: e.target.email.value,
        password: e.target.password.value
      });
      saveSession(res.data.token, res.data.user);
      window.location.replace('dashboard.html');
    } catch (err) { alert(err.message); }
  };
}
