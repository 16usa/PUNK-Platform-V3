
// PUNK CORE V2
// Read-only PostgreSQL token registry interface.

const API_URL = '/api/tokens';

let refreshTimer = null;
let requestController = null;

function escapeHTML(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]
  );
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : date.toLocaleString();
}

function createLivePage() {
  return `
    <section class="live-registry">
      <div class="section-head">
        <div>
          <h1>LIVE TOKENS</h1>
          <p>Tokens registered in the PUNK database.</p>
        </div>
        <span class="demo-pill">DATABASE</span>
      </div>

      <div id="punk-live-status"
           role="status"
           aria-live="polite">
        Connecting to PUNK registry...
      </div>

      <div id="punk-live-list"></div>
    </section>
  `;
}

async function loadLiveTokens() {
  const status = document.getElementById('punk-live-status');
  const list = document.getElementById('punk-live-list');

  if (!status || !list) return;

  if (requestController) requestController.abort();

  requestController = new AbortController();

  try {
    const response = await fetch(API_URL, {
      signal: requestController.signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const data = await response.json();

    if (data.success !== true || !Array.isArray(data.tokens)) {
      throw new Error('Invalid registry response');
    }

    if (!data.tokens.length) {
      status.textContent = 'Registry connected. No active tokens yet.';
      list.innerHTML = '';
      return;
    }

    status.textContent =
      `${data.tokens.length} active token(s) in PUNK registry`;

    list.innerHTML = `
      <div class="panel">
        ${data.tokens.map(token => `
          <div class="token-row">
            <div class="coin">
              <div>
                <strong>${escapeHTML(token.name)}</strong>
                <small>${escapeHTML(token.ticker)}</small>
              </div>
            </div>

            <div>
              <span class="label">PUNK TOKEN ID</span>
              <b>${escapeHTML(token.token_id)}</b>
            </div>

            <div>
              <span class="label">STATUS</span>
              <b class="green">${escapeHTML(token.status)}</b>
            </div>

            <div>
              <span class="label">CREATED</span>
              <small>${escapeHTML(formatDate(token.created_at))}</small>
            </div>
          </div>
        `).join('')}
      </div>
    `;

  } catch (error) {
    if (error.name === 'AbortError') return;

    status.textContent = 'PUNK registry is currently unavailable.';
    list.innerHTML = '';
    console.error('PUNK LIVE:', error.message);
  }
}

function openLivePage() {
  if (refreshTimer) clearInterval(refreshTimer);

  const page = document.getElementById('page');
  if (!page) return;

  page.innerHTML = createLivePage();

  loadLiveTokens();

  refreshTimer = setInterval(() => {
    if (document.getElementById('punk-live-list')) {
      loadLiveTokens();
    } else {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }, 30000);
}

function installLiveNavigation() {
  const nav = document.querySelector('header nav');
  if (!nav) return;

  if (document.getElementById('punk-live-nav')) return;

  const button = document.createElement('button');
  button.id = 'punk-live-nav';
  button.type = 'button';
  button.textContent = 'LIVE TOKENS';

  nav.appendChild(button);

  // Capture navigation before the existing demo router.
  document.addEventListener('click', event => {
    const target = event.target;

    if (!(target instanceof Element)) return;

    if (target.closest('#punk-live-nav')) {
      event.preventDefault();
      event.stopImmediatePropagation();

      openLivePage();
      return;
    }

    if (target.closest('[data-go], [data-token]')) {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }

      if (requestController) {
        requestController.abort();
      }
    }
  }, true);

  button.addEventListener('click', openLivePage);
}

document.addEventListener('DOMContentLoaded', installLiveNavigation);
