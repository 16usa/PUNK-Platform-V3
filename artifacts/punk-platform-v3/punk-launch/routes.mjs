// PUNK independent token creation. Devnet-only; no custodial keys, no Stonk/Pump API.
import crypto from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;
const DEVNET = 'https://api.devnet.solana.com'; // Fixed: cannot point this patch at mainnet
const TOKEN_2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFduXWq5qHPwY8b6r';
const SUPPLY_RAW = '1000000000000000'; // one billion tokens, six decimals
const SESSION_NAME = 'punk_x_session';
const MAX_IMAGE = 256 * 1024;
const rate = new Map();
let pool;
let initializing;

const json = (res, code, body) => {
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(body));
};

const db = async () => {
  if (!process.env.DATABASE_URL) throw new Error('Database is not configured');
  if (!pool) pool = new Pool({connectionString:process.env.DATABASE_URL, max:4, connectionTimeoutMillis:5000});
  if (!initializing) initializing = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS punk_devnet_metadata (
      id TEXT PRIMARY KEY, x_user_id TEXT NOT NULL,
      name VARCHAR(32) NOT NULL, symbol VARCHAR(10) NOT NULL,
      description VARCHAR(1000) NOT NULL DEFAULT '',
      image_type TEXT NOT NULL, image_data BYTEA NOT NULL,
      website TEXT NOT NULL DEFAULT '', twitter TEXT NOT NULL DEFAULT '', telegram TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS punk_devnet_launches (
      mint TEXT PRIMARY KEY, metadata_id TEXT NOT NULL UNIQUE REFERENCES punk_devnet_metadata(id),
      x_user_id TEXT NOT NULL, wallet TEXT NOT NULL, first_tx TEXT NOT NULL,
      final_tx TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  })().catch(err => { initializing = null; throw err; });
  await initializing;
  return pool;
};

function cookie(req, name) {
  const parts = String(req.headers.cookie || '').split(';');
  const match = parts.map(p => p.trim()).find(p => p.startsWith(name+'='));
  return match ? match.slice(name.length+1) : '';
}

async function currentX(req) {
  const session = cookie(req, SESSION_NAME);
  if (!/^[A-Za-z0-9_-]{40,70}$/.test(session)) return null;
  const hash = crypto.createHash('sha256').update(session).digest('hex');
  const result = await (await db()).query(
    'SELECT x_user_id FROM punk_x_login_sessions WHERE session_hash=$1 AND expires_at > NOW() LIMIT 1',
    [hash]
  );
  return result.rows[0]?.x_user_id || null;
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try { return new URL(origin).host.toLowerCase() === String(req.headers.host || '').toLowerCase(); }
  catch { return false; }
}

async function readJSON(req, limit=420*1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Request too large'),{status:413});
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('Invalid JSON'),{status:400}); }
}

function limited(req, category, maximum=30) {
  const now = Date.now();
  if (rate.size > 15000) rate.clear();
  const ip = String(req.socket?.remoteAddress || 'unknown');
  const key = category + ':' + ip;
  const found = rate.get(key);
  if (!found || now - found.start > 60000) {
    rate.set(key, {start:now, count:1});
    return false;
  }
  found.count++;
  return found.count > maximum;
}

function checkedURL(text) {
  if (!text) return '';
  if (typeof text !== 'string' || text.length > 250) throw Object.assign(new Error('Invalid link'),{status:400});
  const url = new URL(text);
  if (url.protocol !== 'https:') throw Object.assign(new Error('Links must use HTTPS'),{status:400});
  return url.toString();
}

function publicOrigin(req) {
  const configured = process.env.PUNK_PUBLIC_URL;
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== 'https:') throw new Error('PUNK_PUBLIC_URL must use HTTPS');
    return url.origin;
  }
  const host = String(req.headers.host || '');
  if (!/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) throw new Error('Invalid host');
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) return 'http://' + host;
  if (!/\.replit\.(dev|app)$/i.test(host)) throw new Error('Set PUNK_PUBLIC_URL for this hostname');
  return 'https://' + host;
}

async function rpc(method, params, url=DEVNET) {
  const reply = await fetch(url, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0', id:1, method, params}),
    signal:AbortSignal.timeout(12000)
  });
  if (!reply.ok) throw new Error('Devnet RPC HTTP ' + reply.status);
  const result = await reply.json();
  if (result.error) throw new Error('Devnet RPC: ' + (result.error.message||'Error'));
  return result.result;
}

export async function punkLaunchMiddleware(req, res, next) {
  let url;
  try { url = new URL(req.url || '/', 'http://localhost'); }
  catch { return next(); }
  if (!url.pathname.startsWith('/api/punk/')) return next();

  const pathname = url.pathname;
  try {
    if (pathname === '/api/punk/status') {
      if (req.method !== 'GET') return json(res,405,{error:'Method not allowed'});
      return json(res,200,{ok:true, version:'independent-launch-v1', network:'devnet',
        launch:'devnet-mint', liquidity:'not-connected', xConfigured:!!(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET && process.env.X_REDIRECT_URI)});
    }
    if (pathname === '/api/punk/launches' && req.method === 'GET') {
      const query = await (await db()).query(`
        SELECT l.mint AS token_id, l.mint, m.name, m.symbol AS ticker,
          m.description, l.wallet AS creator_id, 'minted_devnet' AS status,
          '1000000000' AS total_supply, l.created_at,
          l.metadata_id
        FROM punk_devnet_launches l JOIN punk_devnet_metadata m ON m.id=l.metadata_id
        ORDER BY l.created_at DESC LIMIT 100`);
      const origin = publicOrigin(req);
      return json(res,200,{success:true,network:'devnet',tokens:query.rows.map(row => ({
        ...row,image_url:origin+'/api/punk/image/'+row.metadata_id
      }))});
    }
    const imageMatch = pathname.match(/^\/api\/punk\/image\/([a-f0-9]{32})$/);
    if (imageMatch && req.method === 'GET') {
      const result = await (await db()).query('SELECT image_type,image_data FROM punk_devnet_metadata WHERE id=$1',[imageMatch[1]]);
      if (!result.rows.length) return json(res,404,{error:'Not found'});
      res.writeHead(200, {'Content-Type':result.rows[0].image_type,'Cache-Control':'public, max-age=3600', 'X-Content-Type-Options':'nosniff'});
      return res.end(result.rows[0].image_data);
    }
    const metadataMatch = pathname.match(/^\/api\/punk\/metadata\/([a-f0-9]{32})$/);
    if (metadataMatch && req.method === 'GET') {
      const result = await (await db()).query('SELECT * FROM punk_devnet_metadata WHERE id=$1',[metadataMatch[1]]);
      if (!result.rows.length) return json(res,404,{error:'Not found'});
      const item = result.rows[0];
      const origin = publicOrigin(req);
      return json(res,200,{
        name:item.name, symbol:item.symbol, description:item.description,
        image:origin+'/api/punk/image/'+item.id,
        external_url:item.website || undefined,
        extensions:{website:item.website, twitter:item.twitter, telegram:item.telegram}
      });
    }
    if (pathname === '/api/punk/rpc' && req.method === 'POST') {
      if (!sameOrigin(req)) return json(res,403,{error:'Origin check failed'});
      if (limited(req,'rpc',50)) return json(res,429,{error:'Too many RPC requests'});
      const payload = await readJSON(req,220*1024);
      const allowed = new Set(['getLatestBlockhash','getMinimumBalanceForRentExemption','getAccountInfo','getSignatureStatuses','sendTransaction','getBalance','getFeeForMessage','getBlockHeight','simulateTransaction']);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !allowed.has(payload.method) || !Array.isArray(payload.params)) {
        return json(res,400,{error:'Unsupported RPC request'});
      }
      const response = await fetch(DEVNET, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({jsonrpc:'2.0',id:payload.id ?? 1,method:payload.method,params:payload.params}),
        signal:AbortSignal.timeout(15000)
      });
      if (!response.ok) return json(res,502,{error:'Devnet RPC unavailable',status:response.status});
      const data = await response.json();
      return json(res,200,data);
    }

    if (pathname === '/api/punk/metadata' && req.method === 'POST') {
      if (!sameOrigin(req)) return json(res,403,{error:'Origin check failed'});
      if (limited(req,'upload',6)) return json(res,429,{error:'Too many uploads'});
      const user = await currentX(req);
      if (!user) return json(res,401,{error:'Sign in with X before launching'});
      const data = await readJSON(req);
      const name = String(data?.name || '').trim();
      const symbol = String(data?.symbol || '').trim().toUpperCase();
      const description = String(data?.description || '').trim();
      if (name.length < 2 || name.length > 32 || !/^[A-Z0-9]{2,10}$/.test(symbol) || description.length > 1000) {
        return json(res,400,{error:'Invalid token name, symbol or description'});
      }
      const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(data.imageData || ''));
      if (!match) return json(res,400,{error:'Provide a PNG, JPEG or WebP image'});
      const buffer = Buffer.from(match[2], 'base64');
      if (!buffer.length || buffer.length > MAX_IMAGE) return json(res,400,{error:'Image must be 256 KB or smaller'});
      // Confirm actual image format by signature, never trust browser-supplied MIME alone.
      const png = buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
      const jpg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
      const webp = buffer.subarray(0,4).toString() === 'RIFF' && buffer.subarray(8,12).toString() === 'WEBP';
      if (!(match[1] === 'image/png' && png || match[1] === 'image/jpeg' && jpg || match[1] === 'image/webp' && webp)) {
        return json(res,400,{error:'Image format mismatch'});
      }
      const website = checkedURL(data.website);
      const twitter = checkedURL(data.twitter);
      const telegram = checkedURL(data.telegram);
      const id = crypto.randomBytes(16).toString('hex');
      await (await db()).query(`INSERT INTO punk_devnet_metadata
        (id,x_user_id,name,symbol,description,image_type,image_data,website,twitter,telegram)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [id,user,name,symbol,description,match[1],buffer,website,twitter,telegram]);
      return json(res,201,{ok:true, id, uri:publicOrigin(req)+'/api/punk/metadata/'+id,network:'devnet'});
    }
    if (pathname === '/api/punk/launches' && req.method === 'POST') {
      if (!sameOrigin(req)) return json(res,403,{error:'Origin check failed'});
      if (limited(req,'confirm',12)) return json(res,429,{error:'Too many confirmations'});
      const user = await currentX(req);
      if (!user) return json(res,401,{error:'Sign in with X'});
      const data = await readJSON(req,12000);
      const {metadataId,mint,wallet,firstTx,finalTx} = data || {};
      if (!/^[a-f0-9]{32}$/.test(metadataId||'') ||
        !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint||'') ||
        !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet||'') ||
        !/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(firstTx||'') ||
        !/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(finalTx||'')) {
        return json(res,400,{error:'Invalid on-chain proof'});
      }
      const database = await db();
      const owned = await database.query('SELECT id FROM punk_devnet_metadata WHERE id=$1 AND x_user_id=$2',[metadataId,user]);
      if (!owned.rows.length) return json(res,403,{error:'Metadata does not belong to signed-in X account'});
      const info = await rpc('getAccountInfo',[mint,{encoding:'jsonParsed',commitment:'confirmed'}],process.env.PUNK_DEVNET_RPC_URL||DEVNET);
      const parsed = info?.value?.data?.parsed;
      if (info?.value?.owner !== TOKEN_2022 || parsed?.type !== 'mint' ||
          parsed?.info?.decimals !== 6 || parsed?.info?.supply !== SUPPLY_RAW ||
          parsed?.info?.mintAuthority !== null || parsed?.info?.freezeAuthority !== null) {
        return json(res,409,{error:'Mint not confirmed or does not match PUNK devnet rules'});
      }
      const proof = await rpc('getTransaction',[finalTx,{encoding:'jsonParsed',commitment:'confirmed',maxSupportedTransactionVersion:0}],process.env.PUNK_DEVNET_RPC_URL||DEVNET);
      const keys = proof?.transaction?.message?.accountKeys || [];
      if (proof?.meta?.err || !keys.some(k=>k.pubkey===wallet && k.signer===true) ||
          !keys.some(k=>k.pubkey===mint)) return json(res,409,{error:'Wallet signature/mint not verified'});
      const created = await database.query(`INSERT INTO punk_devnet_launches
        (mint,metadata_id,x_user_id,wallet,first_tx,final_tx)
        VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(mint) DO NOTHING RETURNING mint`,
        [mint,metadataId,user,wallet,firstTx,finalTx]);
      if (!created.rows.length) return json(res,409,{error:'Mint already registered'});
      return json(res,201,{ok:true,mint,network:'devnet',explorer:'https://explorer.solana.com/address/'+mint+'?cluster=devnet'});
    }
    return json(res,404,{error:'Unknown PUNK API route'});
  } catch (error) {
    console.error('PUNK independent launch:', error?.message || 'Unknown');
    return json(res,error.status || 503,{error:error.status ? error.message : 'PUNK launch service temporarily unavailable'});
  }
}
