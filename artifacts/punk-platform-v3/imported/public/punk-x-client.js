// PUNK X OAuth client — client enhancement; no wallet keys are requested.
// X identity is verified on the server, never guessed from an X username.
const LOGIN_BUTTON = document.getElementById('connect');

let xUser = null;
let xConfigured = false;

async function loadXSession() {
  if (!LOGIN_BUTTON) return;
  LOGIN_BUTTON.textContent = '𝕏';
  LOGIN_BUTTON.title = 'Checking X sign-in';
  try {
    const res = await fetch('/api/x/me', { cache: 'no-store' });
    if (!res.ok) throw new Error('API HTTP ' + res.status);
    const data = await res.json();
    xUser = data.user || null;
    xConfigured = data.configured === true;
    if (xUser) {
      LOGIN_BUTTON.textContent = '@' + String(xUser.username).slice(0, 18);
      LOGIN_BUTTON.title = 'Connected to X: @' + xUser.username + ' (tap to sign out)';
      LOGIN_BUTTON.style.fontSize = '12px';
      LOGIN_BUTTON.style.whiteSpace = 'nowrap';
      LOGIN_BUTTON.setAttribute('aria-label', LOGIN_BUTTON.title);
    } else {
      LOGIN_BUTTON.textContent = '𝕏';
      LOGIN_BUTTON.title = xConfigured ? 'Sign in with X' : 'X OAuth is not configured';
      LOGIN_BUTTON.setAttribute('aria-label', LOGIN_BUTTON.title);
    }
  } catch {
    xUser = null;
    xConfigured = false;
    LOGIN_BUTTON.textContent = '𝕏';
    LOGIN_BUTTON.title = 'X sign-in backend unavailable';
  }
}

LOGIN_BUTTON?.addEventListener('click', async event => {
  event.preventDefault();
  if (xUser) {
    if (!window.confirm('Sign out of PUNK?')) return;
    try {
      const res = await fetch('/api/x/logout', { method: 'POST', credentials: 'same-origin' });
      if (!res.ok) throw new Error('Logout failed');
      window.location.reload();
    } catch { window.alert('Could not sign out. Please retry.'); }
    return;
  }
  if (!xConfigured) {
    window.alert('X Login needs X_CLIENT_ID, X_CLIENT_SECRET and X_REDIRECT_URI in Replit Secrets. The API must run on the same host.');
    return;
  }
  window.location.assign('/auth/x/start');
});


loadXSession();
