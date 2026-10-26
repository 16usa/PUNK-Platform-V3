// PUNK independent launch V1 — genuine Solana DEVNET mint, no mainnet, no liquidity.
// The user's Phantom wallet signs every transaction; no private key is sent to PUNK.
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
if (!globalThis.Buffer) globalThis.Buffer = Buffer;
import {
  AuthorityType, ExtensionType, TOKEN_2022_PROGRAM_ID, TYPE_SIZE, LENGTH_SIZE,
  getMintLen, createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction, createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync, createMintToCheckedInstruction,
  createSetAuthorityInstruction
} from '@solana/spl-token';
import { pack, createInitializeInstruction } from '@solana/spl-token-metadata';

const $ = selector => document.querySelector(selector);
const DECIMALS = 6;
const SUPPLY_RAW = 1000000000000000n;
const PENDING_KEY = 'punk_devnet_pending_v1';
let wallet = null;
let statusX = null;
let imageURL = null;
let busy = false;

function message(s, type='') {
  const node = $('#punk-launch-status');
  if (!node) return;
  node.textContent = s;
  node.dataset.state = type;
}

function account() {
  const p = (window.phantom?.solana?.isPhantom && window.phantom.solana)
    || (window.solana?.isPhantom && window.solana);
  return p?.isPhantom ? p : null;
}

async function fetchX() {
  const node = $('#punk-launch-x-status');
  if (!node) return;
  try {
    const response = await fetch('/api/x/me', {cache:'no-store',credentials:'same-origin'});
    if (!response.ok) throw Error('HTTP ' + response.status);
    statusX = await response.json();
    node.textContent = statusX.user
      ? 'X: @' + statusX.user.username + ' ✓'
      : statusX.configured ? 'Log in with X using the 𝕏 button in the header.'
        : 'X OAuth is not configured in Replit Secrets yet.';
  } catch {
    statusX = null;
    node.textContent = 'X sign-in service is offline. Restart PUNK Express.';
  }
}

async function connectWallet() {
  const provider = account();
  if (!provider) {
    message('Phantom not detected. On iPhone, open PUNK inside the Phantom in-app browser. Select DEVNET in Phantom settings.', 'error');
    return;
  }
  try {
    const result = await provider.connect();
    const publicKey = result.publicKey || provider.publicKey;
    if (!publicKey || typeof provider.signTransaction !== 'function') throw Error('Wallet does not support transaction signing');
    wallet = {provider, publicKey};
    const label = $('#punk-wallet-state');
    if (label) label.textContent = 'Phantom: ' + publicKey.toBase58().slice(0,7) + '…' + publicKey.toBase58().slice(-5);
    message('Phantom connected. Transactions will use Solana DEVNET only.', 'ok');
    offerResume();
  } catch (e) {
    message('Phantom connection failed: ' + (e.message || e), 'error');
  }
}

function connection() {
  // Same-origin, restricted proxy. Secret/private RPC URLs stay on the server.
  return new Connection(window.location.origin + '/api/punk/rpc', {commitment:'confirmed'});
}

async function sendSigned(connection, tx, mintKeypair, onBroadcast) {
  const {blockhash,lastValidBlockHeight} = await connection.getLatestBlockhash('confirmed');
  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = blockhash;
  if (mintKeypair) tx.partialSign(mintKeypair);
  const signed = await wallet.provider.signTransaction(tx);
  // PUNK forwards the serialized transaction to DEVNET, not mainnet.
  const signature = await connection.sendRawTransaction(signed.serialize(), {skipPreflight:false,maxRetries:3});
  if (onBroadcast) onBroadcast(signature);
  const result = await connection.confirmTransaction({signature,blockhash,lastValidBlockHeight}, 'confirmed');
  if (result.value.err) throw Error('Transaction failed: ' + JSON.stringify(result.value.err));
  return signature;
}

async function imageData(file) {
  if (!file || !['image/png','image/jpeg','image/webp'].includes(file.type)) throw Error('Select PNG, JPG or WebP image');
  if (file.size > 256 * 1024) throw Error('For the Devnet prototype, image must be no larger than 256 KB. Use a smaller image.');
  return await new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(Error('Cannot read image'));
    reader.readAsDataURL(file);
  });
}

function setBusy(value) {
  busy = value;
  const button = $('#punk-launch-submit');
  if (button) button.disabled = value;
}

function ensureReady() {
  if (!statusX?.user) throw Error('Sign in with X first.');
  if (!wallet?.publicKey || !account() || wallet.provider !== account()) throw Error('Connect Phantom first.');
}

async function registerMint(pending) {
  const response = await fetch('/api/punk/launches', {
    method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin',
    body:JSON.stringify({metadataId:pending.metadataId,mint:pending.mint,wallet:pending.wallet,firstTx:pending.firstTx,finalTx:pending.finalTx})
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw Error(result.error || 'Cannot save launch in PUNK registry');
  localStorage.removeItem(PENDING_KEY);
  const link = 'https://explorer.solana.com/address/' + encodeURIComponent(result.mint) + '?cluster=devnet';
  const output = $('#punk-launch-result');
  if (output) {
    output.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = 'DEVNET mint created successfully';
    const address = document.createElement('p');
    address.textContent = 'Mint address: ' + result.mint;
    const anchor = document.createElement('a');
    anchor.href = link;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = 'View in Solana Explorer (Devnet) ↗';
    output.append(title,address,anchor);
    output.hidden = false;
  }
  message('Mint is confirmed and recorded. No trading pool has been created yet.', 'ok');
}

async function finishPending(pending) {
  ensureReady();
  if (pending.wallet !== wallet.publicKey.toBase58()) throw Error('Reconnect the original Phantom wallet: ' + pending.wallet);
  if (!pending.firstTx) throw Error('First transaction not yet broadcast. The token mint cannot be resumed safely.');
  const conn = connection();
  const mint = new PublicKey(pending.mint);
  if (!pending.finalTx) {
    // Transaction 2: create ATA, mint fixed supply, permanently revoke mint authority.
    const ata = getAssociatedTokenAddressSync(mint,wallet.publicKey,false,TOKEN_2022_PROGRAM_ID);
    const existing = await conn.getAccountInfo(ata,'confirmed');
    const tx = new Transaction();
    if (!existing) tx.add(createAssociatedTokenAccountInstruction(wallet.publicKey,ata,wallet.publicKey,mint,TOKEN_2022_PROGRAM_ID));
    const mintInfo = await conn.getParsedAccountInfo(mint,'confirmed');
    if (!mintInfo.value) throw Error('Devnet mint not found; retry when RPC is available');
    const info = mintInfo.value.data?.parsed?.info;
    if (info?.mintAuthority === wallet.publicKey.toBase58() && info?.supply === '0') {
      tx.add(createMintToCheckedInstruction(mint,ata,wallet.publicKey,SUPPLY_RAW,DECIMALS,[],TOKEN_2022_PROGRAM_ID));
      tx.add(createSetAuthorityInstruction(mint,wallet.publicKey,AuthorityType.MintTokens,null,[],TOKEN_2022_PROGRAM_ID));
      pending.finalTx = await sendSigned(conn,tx,null, signature => {
        pending.finalTx = signature;
        localStorage.setItem(PENDING_KEY,JSON.stringify(pending));
      });
    } else if (info?.mintAuthority === null && info?.supply === SUPPLY_RAW.toString()) {
      // A previous transaction may have landed even if confirmation timed out.
      // Must find its signature before allowing registry submission.
      if (!pending.finalTx) throw Error('Mint already finalized on Devnet. Open its explorer page; the confirmation signature needs recovery before registry submission.');
    } else {
      throw Error('Mint state differs from the PUNK fixed-supply launch rules');
    }
  }
  message('Verifying the two Devnet transactions and recording mint on PUNK…');
  await registerMint(pending);
}

function offerResume() {
  const node = $('#punk-launch-resume');
  if (!node) return;
  let pending;
  try { pending = JSON.parse(localStorage.getItem(PENDING_KEY)||'null'); } catch {}
  node.hidden = !pending;
  if (!pending) return;
  const hint = $('#punk-launch-pending');
  if (hint) hint.textContent = 'Incomplete Devnet mint: ' + pending.mint + '. If token initialization already succeeded, use Resume (do not start another launch).';
}

async function resume() {
  if (busy) return;
  setBusy(true);
  try {
    const pending = JSON.parse(localStorage.getItem(PENDING_KEY)||'null');
    if (!pending) throw Error('No pending launch');
    message('Resuming Devnet mint…');
    await finishPending(pending);
  } catch (e) { message('Resume: ' + (e.message||e), 'error'); }
  finally { setBusy(false); offerResume(); }
}

async function start(event) {
  event.preventDefault();
  if (busy) return;
  const form = $('#punk-launch-form');
  if (!form?.reportValidity()) return;
  setBusy(true);
  try {
    if (localStorage.getItem(PENDING_KEY)) throw Error('An earlier mint is unfinished. Use Resume first.');
    await fetchX();
    ensureReady();
    const name = $('#punk-launch-name').value.trim();
    const symbol = $('#punk-launch-symbol').value.trim().toUpperCase();
    const description = $('#punk-launch-description').value.trim();
    if (name.length<2 || name.length>32 || !/^[A-Z0-9]{2,10}$/.test(symbol)) throw Error('Token name must be 2–32 characters; symbol 2–10 letters/numbers');
    if (!window.confirm('Create a REAL token mint on SOLANA DEVNET? This uses test SOL, not mainnet SOL. Trading and liquidity are NOT included.')) return;
    message('Uploading metadata to PUNK database…');
    const file = $('#punk-launch-image').files[0];
    const payload = {
      name,symbol,description,imageData:await imageData(file),
      website:$('#punk-launch-website').value.trim(),
      twitter:$('#punk-launch-twitter').value.trim(),
      telegram:$('#punk-launch-telegram').value.trim()
    };
    const response = await fetch('/api/punk/metadata',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const meta = await response.json();
    if (!response.ok || !meta.ok) throw Error(meta.error||'Metadata upload failed');

    const conn = connection();
    const mint = Keypair.generate(); // Local ephemeral mint signer. Never uploaded to PUNK.
    const metadata = {
      mint:mint.publicKey, name,symbol,uri:meta.uri,
      additionalMetadata:[], updateAuthority:wallet.publicKey
    };
    const mintLen = getMintLen([ExtensionType.MetadataPointer]);
    const sizeForRent = mintLen + TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
    const rent = await conn.getMinimumBalanceForRentExemption(sizeForRent,'confirmed');
    const tx = new Transaction().add(
      SystemProgram.createAccount({fromPubkey:wallet.publicKey,newAccountPubkey:mint.publicKey,space:mintLen,lamports:rent,programId:TOKEN_2022_PROGRAM_ID}),
      createInitializeMetadataPointerInstruction(mint.publicKey,wallet.publicKey,mint.publicKey,TOKEN_2022_PROGRAM_ID),
      createInitializeMintInstruction(mint.publicKey,DECIMALS,wallet.publicKey,null,TOKEN_2022_PROGRAM_ID),
      createInitializeInstruction({programId:TOKEN_2022_PROGRAM_ID,metadata:mint.publicKey,updateAuthority:wallet.publicKey,mint:mint.publicKey,mintAuthority:wallet.publicKey,name,symbol,uri:meta.uri})
    );
    message('Transaction 1/2: approve Token-2022 mint and metadata in Phantom (DEVNET)…');
    const pending = {metadataId:meta.id,mint:mint.publicKey.toBase58(),wallet:wallet.publicKey.toBase58(),firstTx:null,finalTx:null};
    pending.firstTx = await sendSigned(conn,tx,mint, signature => {
      pending.firstTx = signature;
      localStorage.setItem(PENDING_KEY,JSON.stringify(pending));
    });
    localStorage.setItem(PENDING_KEY,JSON.stringify(pending));
    message('Mint confirmed. Transaction 2/2: mint fixed supply and revoke mint authority (DEVNET)…');
    await finishPending(pending);
  } catch (e) {
    message('Launch: ' + (e.message||e) + '. If a mint was already created, use Resume.', 'error');
  } finally {
    setBusy(false);
    offerResume();
  }
}

function imagePreview() {
  const file = $('#punk-launch-image')?.files?.[0];
  const preview = $('#punk-launch-preview');
  if (imageURL) URL.revokeObjectURL(imageURL);
  imageURL = null;
  if (!preview) return;
  preview.hidden = true;
  if (!file) return;
  if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>256*1024) {
    $('#punk-launch-image').value='';
    message('Choose a PNG/JPG/WebP image ≤ 256 KB. This version preserves the original bytes, without quality loss.', 'error');
    return;
  }
  imageURL = URL.createObjectURL(file);
  preview.src=imageURL;
  preview.hidden=false;
}

function install() {
  const form = $('#punk-launch-form');
  if (!form || form.dataset.installed === '1') return;
  form.dataset.installed='1';
  form.addEventListener('submit',start);
  $('#punk-wallet-button')?.addEventListener('click',connectWallet);
  $('#punk-launch-resume-button')?.addEventListener('click',resume);
  $('#punk-launch-image')?.addEventListener('change',imagePreview);
  offerResume();
  fetchX();
}

document.addEventListener('click',e=>{
  if (e.target instanceof Element && e.target.closest('[data-go="create"]')) setTimeout(install,0);
});
if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',install);
else install();
