
// PUNK CORE V3 — real PostgreSQL registry UI.
// Trading, payments and X OAuth are not enabled.

const API = '/api/punk/launches';

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
  return `${registry.length} minted Devnet token(s)`;
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
    but there are no confirmed Devnet mints yet.</p>
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
        <span class="green">DEVNET MINTED</span>
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
            data-go="new">Explore Tokens</button>
          <button class="btn"
            data-go="create">Create Token</button>
        </div>
      </div>
    </section>

    <div class="stats">
      <div class="stat"><strong>${connected ? registry.length : '—'}</strong><span>Devnet Minted Tokens</span></div>
      <div class="stat"><strong>DEVNET</strong><span>Network · No Mainnet or Trading Yet</span></div>
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
          No trading pool exists yet. This is a Devnet mint only.
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
      'Confirmed Solana Devnet mints created on PUNK.',
      [...registry].sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      )
    );
  } else if (currentPage === 'trending') {
    page.innerHTML = listing(
      'Trending',
      'Registered tokens. No trading or liquidity yet — mint-only Devnet pilot.',
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
    page.innerHTML = `
      <section>
        <div class="section-head"><div><h1>Launch Token</h1>
          <p>Independent PUNK token creation. No third-party launchpad redirect.</p>
        </div><span class="demo-pill">SOLANA DEVNET</span></div>
        <div class="panel punk-launch-editor">
          <p class="punk-launch-note"><strong>Devnet pilot:</strong> creates a real Token-2022 mint on the Solana test network.
          This does not create a trading pool or mainnet token. Do not send real SOL.</p>
          <p class="punk-launch-state" id="punk-launch-x-status" role="status">Checking X account…</p>
          <p class="punk-launch-state" id="punk-wallet-state">Phantom wallet not connected</p>
          <p class="punk-launch-state" id="punk-launch-status" role="status" aria-live="polite">
            Connect X and Phantom to launch on Devnet.</p>
          <div id="punk-launch-resume" class="punk-launch-resume" hidden>
            <p id="punk-launch-pending"></p>
            <button type="button" class="btn" id="punk-launch-resume-button">Resume previous mint</button>
          </div>
          <form id="punk-launch-form" autocomplete="off">
            <div class="punk-launch-grid">
              <div><label for="punk-launch-name">Token name *</label>
                <input id="punk-launch-name" name="name" maxlength="32" minlength="2" required placeholder="Token name"></div>
              <div><label for="punk-launch-symbol">Symbol *</label>
                <input id="punk-launch-symbol" name="symbol" maxlength="10" required pattern="[A-Za-z0-9]{2,10}" placeholder="TICKER"></div>
            </div>
            <label for="punk-launch-image">Token image * · original PNG/JPG/WebP up to 256 KB</label>
            <input id="punk-launch-image" type="file" name="image" accept="image/png,image/jpeg,image/webp" required>
            <img id="punk-launch-preview" alt="Token image preview" hidden>
            <label for="punk-launch-description">Description</label>
            <textarea id="punk-launch-description" name="description" maxlength="1000" placeholder="Describe your token"></textarea>
            <div class="punk-launch-grid">
              <div><label for="punk-launch-website">Website</label>
                <input id="punk-launch-website" name="website" type="url" placeholder="https://example.com"></div>
              <div><label for="punk-launch-twitter">X profile / token community</label>
                <input id="punk-launch-twitter" name="twitter" type="url" placeholder="https://x.com/project"></div>
            </div>
            <label for="punk-launch-telegram">Telegram</label>
            <input id="punk-launch-telegram" name="telegram" type="url" placeholder="https://t.me/project">
            <div class="punk-launch-actions">
              <button type="button" class="btn" id="punk-wallet-button">Connect Phantom</button>
              <button type="submit" class="btn primary" id="punk-launch-submit">Create DEVNET Mint</button>
            </div>
          </form>
          <div class="punk-launch-result" id="punk-launch-result" hidden></div>
          <p class="punk-launch-note">Fixed supply: 1,000,000,000 tokens (6 decimals), minted to your wallet.
          No freeze authority. Mint authority is revoked after minting.
          The mint and metadata update authority remain under your wallet. Two Phantom confirmations are required.</p>
          <p class="punk-launch-note"><strong>Not yet live trading:</strong> no bonding curve, liquidity, Jupiter swaps,
          exchange listing or automated market cap. Devnet metadata image is stored in the PUNK database;
          the Preview URL is temporary. Mainnet remains disabled.</p>
        </div>
      </section>`;
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
        ? 'DEVNET READY'
        : 'DEVNET OFFLINE';
    }

    if (currentPage !== 'create') render();
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

// X sign-in is handled by punk-x-client.js.

render();
loadRegistry();

setInterval(() => {
  if (!document.hidden) loadRegistry();
}, 30000);
