
// PUNK CORE V3 — real PostgreSQL registry UI.
// Trading, payments and X OAuth are not enabled.

const API = '/api/tokens';

let registry = [];
let connected = false;
let loading = true;
let errorMessage = '';
let currentPage = 'home';
let selectedToken = null;

const page = document.getElementById('page');
const badge = document.getElementById('punk-live-state');

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

function dateText(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString();
}

function imageMarkup(token) {
  const value = String(token.image_url || '');

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return '';
    return `<img src="${esc(url.href)}"
      alt="${esc(token.name)}"
      loading="lazy"
      referrerpolicy="no-referrer">`;
  } catch {
    return '';
  }
}

function statusText() {
  if (loading) return 'Connecting to PUNK database...';
  if (!connected) return 'PUNK database unavailable.';
  return `${registry.length} registered token(s)`;
}

function emptyState() {
  if (loading) {
    return '<div class="panel punk-empty">Loading tokens...</div>';
  }

  if (!connected) {
    return `<div class="panel punk-empty">
      Registry connection unavailable.
      <p>${esc(errorMessage)}</p>
      <button class="btn" data-refresh>Retry</button>
    </div>`;
  }

  return `<div class="panel punk-empty">
    <h3>No tokens launched yet</h3>
    <p>The PUNK registry is connected,
    but there are no active tokens.</p>
  </div>`;
}

function tokenRows(items) {
  if (!items.length) return emptyState();

  return `<div class="panel punk-registry">
    ${items.map(t => `
      <button class="punk-registry-row"
        data-punk-token="${esc(t.token_id)}">
        <span class="punk-token-name">
          ${imageMarkup(t)}
          <span>
            <strong>${esc(t.name)}</strong>
            <small>${esc(t.ticker)}</small>
          </span>
        </span>
        <span class="punk-token-meta">
          <small>PUNK TOKEN ID</small>
          <b>${esc(t.token_id)}</b>
        </span>
        <span class="punk-token-meta">
          <small>CREATED</small>
          <b>${esc(dateText(t.created_at))}</b>
        </span>
        <span class="green">ACTIVE</span>
      </button>
    `).join('')}
  </div>`;
}

function home() {
  return `
    <section class="hero">
      <div>
        <h1>Your X. <span class="blue">Your Money.</span>
        <br>Your Market.</h1>
        <p>Discover and launch tokens on PUNK.
        Built around the X ecosystem.</p>
        <div class="hero-actions">
          <button class="btn primary"
            data-go="trending">Explore Tokens</button>
          <button class="btn"
            data-go="create">Create Token</button>
        </div>
      </div>
    </section>

    <div class="stats">
      <div class="stat">
        <strong>${connected ? registry.length : '—'}</strong>
        <span>Active Registered Tokens</span>
      </div>
      <div class="stat">
        <strong>—</strong>
        <span>24h Trading Volume · Unavailable</span>
      </div>
      <div class="stat">
        <strong>—</strong>
        <span>Active Traders · Unavailable</span>
      </div>
      <div class="stat">
        <strong>Not connected</strong>
        <span>X Money</span>
      </div>
    </div>

    <section>
      <div class="section-head">
        <div>
          <h2>Explore Tokens</h2>
          <p>${esc(statusText())}</p>
        </div>
        <button class="btn" data-go="new">
          View All
        </button>
      </div>
      ${tokenRows(registry.slice(0, 10))}
    </section>
  `;
}

function listing(title, subtitle, items) {
  return `
    <section>
      <div class="section-head">
        <div>
          <h1>${esc(title)}</h1>
          <p>${esc(subtitle)}</p>
        </div>
        <button class="btn" data-refresh>Refresh</button>
      </div>
      ${tokenRows(items)}
    </section>
  `;
}

function tokenDetail() {
  const t = registry.find(
    x => x.token_id === selectedToken
  );

  if (!t) return emptyState();

  return `
    <section>
      <button class="btn" data-go="new">
        ← Back to Tokens
      </button>
      <div class="panel punk-detail">
        <div class="punk-token-name">
          ${imageMarkup(t)}
          <div>
            <h1>${esc(t.name)}</h1>
            <p>${esc(t.ticker)}</p>
          </div>
        </div>
        <p><b>PUNK Token ID:</b> ${esc(t.token_id)}</p>
        <p><b>Status:</b> ${esc(t.status)}</p>
        <p><b>Supply:</b> ${esc(t.total_supply)}</p>
        <p><b>Created:</b> ${esc(dateText(t.created_at))}</p>
        <p>${esc(t.description || '')}</p>
        <div class="panel punk-empty">
          Trading is not available yet.
          No live price or liquidity exists in the registry.
        </div>
      </div>
    </section>
  `;
}

function unavailable(title, message) {
  return `<section>
    <h1>${esc(title)}</h1>
    <div class="panel punk-empty">
      <p>${esc(message)}</p>
    </div>
  </section>`;
}

function render() {
  if (!page) return;

  document.querySelectorAll('header nav button')
    .forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.go === currentPage
      );
    });

  if (currentPage === 'home') {
    page.innerHTML = home();
  } else if (currentPage === 'new') {
    page.innerHTML = listing(
      'New Tokens',
      'Real token records from PUNK PostgreSQL.',
      [...registry].sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      )
    );
  } else if (currentPage === 'trending') {
    page.innerHTML = listing(
      'Trending',
      'Registered tokens. Trading-based rankings are not available yet.',
      registry
    );
  } else if (currentPage === 'token') {
    page.innerHTML = tokenDetail();
  } else if (currentPage === 'leaderboard') {
    page.innerHTML = unavailable(
      'Leaderboard',
      'Real rankings will appear after the trading engine is integrated.'
    );
  } else if (currentPage === 'create') {
    page.innerHTML = unavailable(
      'Create Token',
      'Token creation will be enabled after X authentication and secure server-side creation are ready.'
    );
  } else if (currentPage === 'portfolio') {
    page.innerHTML = unavailable(
      'Portfolio',
      'Connect your X account when authentication becomes available. No real balances are connected.'
    );
  } else {
    page.innerHTML = home();
  }
}

async function loadRegistry() {
  loading = true;
  render();

  try {
    const response = await fetch(API, {
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`API returned HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.success !== true || !Array.isArray(data.tokens)) {
      throw new Error('Invalid API response');
    }

    registry = data.tokens;
    connected = true;
    errorMessage = '';

  } catch (error) {
    connected = false;
    registry = [];
    errorMessage = error.message || 'Unknown error';
    console.error('PUNK registry:', error);
  } finally {
    loading = false;

    if (badge) {
      badge.textContent = connected
        ? 'REGISTRY LIVE'
        : 'REGISTRY OFFLINE';
    }

    render();
  }
}

document.addEventListener('click', event => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const nav = target.closest('[data-go]');

  if (nav) {
    currentPage = nav.dataset.go;
    selectedToken = null;
    render();
    return;
  }

  const tokenButton = target.closest('[data-punk-token]');

  if (tokenButton) {
    selectedToken = tokenButton.dataset.punkToken;
    currentPage = 'token';
    render();
    return;
  }

  if (target.closest('[data-refresh]')) {
    loadRegistry();
  }
});

document.getElementById('connect')
  ?.addEventListener('click', () => {
    alert(
      'X authentication is not connected yet. ' +
      'PUNK will support X sign-in in a future development stage.'
    );
  });

render();
loadRegistry();

setInterval(() => {
  if (!document.hidden) loadRegistry();
}, 30000);
