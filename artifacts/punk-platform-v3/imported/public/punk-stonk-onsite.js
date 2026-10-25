// PUNK StonkFun On-site V2: form and wallet connection only.
// No mint, fee payment or blockchain transaction is sent by this version.
let punkStonkQuoteOptions = [];
let punkStonkWallet = null;
let punkStonkImageUrl = null;

const stonk$ = selector => document.querySelector(selector);

function showStonkMessage(message, type = '') {
  const status = stonk$('#punk-stonk-onsite-status');
  if (!status) return;
  status.textContent = message;
  status.dataset.state = type;
}

async function fetchLaunchPairs() {
  const select = stonk$('#punk-stonk-quote');
  if (!select) return;
  select.innerHTML = '<option value="">Loading eligible pairs…</option>';
  select.disabled = true;
  try {
    const [pairsResponse, statsResponse] = await Promise.all([
      fetch('/api/stonk/pairs', { cache: 'no-store' }),
      fetch('/api/stonk/stats', { cache: 'no-store' }),
    ]);
    // PUNK API V4 error clarification: distinguish a missing local route from a StonkFun outage.
    if (!pairsResponse.ok) {
      const responseType = pairsResponse.headers.get('content-type') || '';
      const reason = pairsResponse.status === 404 && !responseType.includes('json')
        ? 'PUNK backend is not running (API returned HTML 404). Restart PUNK API V4.'
        : 'Pairs API HTTP ' + pairsResponse.status;
      throw new Error(reason);
    }
    const parsed = await pairsResponse.json();
    const pairs = parsed?.data?.pairs ?? parsed?.pairs;
    if (!Array.isArray(pairs)) throw new Error('Unrecognized StonkFun pairs response');
    punkStonkQuoteOptions = pairs.filter(x => x && typeof x.mint === 'string' && x.mint.length > 20);
    select.innerHTML = '';
    if (!punkStonkQuoteOptions.length) {
      select.add(new Option('No launch-ready pairs', ''));
      showStonkMessage('No launch-ready quote tokens available. No launch can proceed.', 'error');
      return;
    }
    select.add(new Option('Select a quote token', ''));
    for (const pair of punkStonkQuoteOptions) {
      const label = String(pair.symbol || pair.ticker || pair.name || pair.mint.slice(0, 8)).slice(0, 60);
      select.add(new Option(label + ' · ' + pair.mint.slice(0, 6) + '…', pair.mint));
    }
    select.disabled = false;
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      const config = stats?.data?.config ?? stats?.config ?? {};
      if (config.launchLabEnabled === false && config.paidLaunchesEnabled === false) {
        showStonkMessage('StonkFun reports launch paths unavailable.', 'error');
        return;
      }
    }
    showStonkMessage('StonkFun API connected · ' + punkStonkQuoteOptions.length + ' eligible quote pairs. On-chain launch is not enabled yet.', 'info');
  } catch (error) {
    select.innerHTML = '<option value="">StonkFun API unavailable</option>';
    showStonkMessage('Cannot load StonkFun pairs: ' + error.message, 'error');
  }
}

async function refreshXNotice() {
  const notice = stonk$('#punk-stonk-x-status');
  if (!notice) return;
  try {
    const response = await fetch('/api/x/me', { cache: 'no-store' });
    if (!response.ok) throw new Error('X API HTTP ' + response.status);
    const data = await response.json();
    notice.textContent = data.user
      ? 'X connected: @' + String(data.user.username)
      : data.configured ? 'Sign in using the X button above before launching.' : 'X OAuth credentials have not been configured yet.';
  } catch {
    notice.textContent = 'X sign-in API is offline; check Preview server configuration.';
  }
}

function uploadImagePreview() {
  const file = stonk$('#punk-stonk-image')?.files?.[0];
  const preview = stonk$('#punk-stonk-image-preview');
  if (punkStonkImageUrl) URL.revokeObjectURL(punkStonkImageUrl);
  punkStonkImageUrl = null;
  if (!preview) return;
  preview.removeAttribute('src');
  preview.hidden = true;
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    showStonkMessage('Upload a PNG/JPEG/WebP image no larger than 2 MB.', 'error');
    stonk$('#punk-stonk-image').value = '';
    return;
  }
  punkStonkImageUrl = URL.createObjectURL(file);
  preview.src = punkStonkImageUrl;
  preview.hidden = false;
}

async function connectPunkWallet() {
  const provider = (window.phantom?.solana?.isPhantom && window.phantom.solana)
    || (window.solana?.isPhantom && window.solana)
    || (window.solflare?.isSolflare && window.solflare);
  if (!provider?.connect) {
    showStonkMessage('Wallet unavailable here. Open this PUNK website inside the Phantom or Solflare wallet browser on your phone.', 'error');
    return;
  }
  try {
    const result = await provider.connect();
    const key = result?.publicKey || provider.publicKey;
    if (!key?.toBase58) throw new Error('Wallet did not return a public address');
    punkStonkWallet = { address: key.toBase58(), provider };
    const walletText = stonk$('#punk-stonk-wallet-state');
    if (walletText) walletText.textContent = 'Wallet: ' + punkStonkWallet.address.slice(0, 7) + '…' + punkStonkWallet.address.slice(-5);
    showStonkMessage('Wallet connected. No transaction was requested or signed.', 'info');
  } catch (error) {
    showStonkMessage('Wallet connection cancelled or failed: ' + (error?.message || 'Unknown error'), 'error');
  }
}

function reviewToken(event) {
  event.preventDefault();
  const form = stonk$('#punk-stonk-create-form');
  if (!form || !form.reportValidity()) return;
  const fields = new FormData(form);
  const name = String(fields.get('name') || '').trim();
  const symbol = String(fields.get('symbol') || '').trim().toUpperCase();
  const mint = String(fields.get('quoteMint') || '');
  const file = stonk$('#punk-stonk-image')?.files?.[0];
  if (!name || name.length > 32 || !/^[A-Za-z0-9]{1,10}$/.test(symbol) || !file) {
    showStonkMessage('Check the name (max 32), symbol (1–10 letters/numbers) and logo.', 'error');
    return;
  }
  if (!punkStonkQuoteOptions.some(x => x.mint === mint)) {
    showStonkMessage('Choose a quote token from the live StonkFun list.', 'error');
    return;
  }
  const result = stonk$('#punk-stonk-review');
  if (result) {
    result.replaceChildren();
    const lines = [
      'Token: ' + name + ' ($' + symbol + ')',
      'Quote mint: ' + mint,
      'Image: ' + file.name,
      'Wallet: ' + (punkStonkWallet?.address || 'Not connected'),
      'Launch status: NOT SENT. Mint creation, metadata storage, transaction preparation and wallet signing still need to be integrated.',
    ];
    for (const line of lines) {
      const p = document.createElement('p');
      p.textContent = line;
      result.appendChild(p);
    }
    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  showStonkMessage('Review prepared locally on PUNK. No on-chain transaction sent.', 'info');
}

function installOnsiteForm() {
  const form = stonk$('#punk-stonk-create-form');
  if (!form || form.dataset.ready === '1') return;
  form.dataset.ready = '1';
  form.addEventListener('submit', reviewToken);
  stonk$('#punk-stonk-wallet-button')?.addEventListener('click', connectPunkWallet);
  stonk$('#punk-stonk-image')?.addEventListener('change', uploadImagePreview);
  fetchLaunchPairs();
  refreshXNotice();
}

document.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('[data-go="create"]')) {
    setTimeout(installOnsiteForm, 0);
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installOnsiteForm);
} else {
  installOnsiteForm();
}
