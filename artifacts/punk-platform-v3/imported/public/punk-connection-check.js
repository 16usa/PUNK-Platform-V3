// PUNK V1.2: independent of Solana SDK, so status and X login checks work
// even if the heavy wallet/chain client fails to initialize on mobile Safari.
const TIMEOUT = 8500;
const badge = document.getElementById('punk-live-state');
let testing = false;

async function requestJSON(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetch(path, {
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('json')) {
      throw Error('HTTP ' + response.status + ' (not JSON: wrong Preview server?)');
    }
    const json = await response.json();
    if (!response.ok) throw Error('HTTP ' + response.status + ': ' + String(json.error || 'unknown error'));
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

function updateText(id, value) {
  const element = document.getElementById(id);
  if (element && typeof value === 'string') element.textContent = value;
}

async function checkConnections() {
  if (testing || document.hidden) return;
  testing = true;
  const [server, registry, x] = await Promise.allSettled([
    requestJSON('/api/punk/status'),
    requestJSON('/api/punk/launches'),
    requestJSON('/api/x/me')
  ]);
  const serverOK = server.status === 'fulfilled' && server.value?.ok === true;
  const registryOK = registry.status === 'fulfilled' && registry.value?.success === true && Array.isArray(registry.value.tokens);
  if (badge) {
    // This badge refers only to the registry, not Solana network health.
    badge.textContent = registryOK ? 'REGISTRY ONLINE' : 'REGISTRY OFFLINE';
    badge.title = registryOK ? 'Devnet launch registry API connected' :
      (serverOK ? 'PUNK API answers, but token database is unavailable' :
      'PUNK API not responding. Make sure Replit is running Express.');
  }
  if (x.status === 'fulfilled') {
    const data = x.value;
    const msg = data.user
      ? 'X connected: @' + String(data.user.username || '')
      : data.configured
        ? 'X ready. Tap the 𝕏 button in the header to sign in.'
        : 'X sign-in not configured. Set OAuth keys in Replit Secrets.';
    const node = document.getElementById('punk-launch-x-status');
    // Do not overwrite actionable blockchain transaction messages.
    if (node) node.textContent = msg;
  } else {
    updateText('punk-launch-x-status', 'X API unavailable: ' + String(x.reason?.message || 'Connection error'));
  }
  if (!serverOK) {
    updateText('punk-launch-status', 'PUNK server API unavailable: ' + String(server.reason?.message || 'Unexpected status') + '. Replit should run Express, not a static/Vite server.');
  } else if (!registryOK) {
    const error = String(registry.reason?.message || 'Registry unavailable');
    updateText('punk-launch-status', 'PUNK API connected, but registry error: ' + error);
  } else if (globalThis.__punkLaunchRuntime === 'error') {
    updateText('punk-launch-status', 'Launch client failed to initialize: ' + String(globalThis.__punkLaunchError || 'unknown JS error'));
  } else if (globalThis.__punkLaunchRuntime === 'loading') {
    updateText('punk-launch-status', 'PUNK API connected. Initializing Phantom launch client…');
  } else if (globalThis.__punkLaunchRuntime !== 'loaded') {
    updateText('punk-launch-status', 'PUNK API connected. Launch client not detected; reload the page.');
  }
  testing = false;
}

setTimeout(checkConnections, 700);
document.addEventListener('click', event => {
  if (event.target instanceof Element && event.target.closest('[data-go="create"]')) {
    setTimeout(checkConnections, 100);
  }
});
// Do not aggressively re-render or reset a launch form during a signing flow.
window.addEventListener('focus', () => setTimeout(checkConnections, 400));
