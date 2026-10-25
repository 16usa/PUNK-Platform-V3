// PUNK X + StonkFun V1
// Server-side X OAuth with PKCE, database-backed sessions, read-only StonkFun bridge.
// This module never signs or submits a token-launch transaction.
import crypto from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;
const SESSION_NAME = 'punk_x_session';
const FLOW_NAME = 'punk_x_oauth_state';
const SEVEN_DAYS = 7 * 24 * 60 * 60;
const STONK_BASE = 'https://www.stonkfun.xyz/api/public/v1';
const allowedSort = new Set(['newest', 'marketCap', 'volume']);
let pool;
let schemaReady;

function database() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing');
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 4,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
  }
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS punk_x_login_flows (
          state_hash TEXT PRIMARY KEY,
          pkce_verifier TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS punk_x_login_sessions (
          session_hash TEXT PRIMARY KEY,
          x_user_id TEXT NOT NULL,
          x_username TEXT NOT NULL,
          x_name TEXT NOT NULL,
          x_avatar_url TEXT,
          expires_at TIMESTAMPTZ NOT NULL
        )
      `);
    })().catch(error => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady.then(() => pool);
}

const randomToken = () => crypto.randomBytes(32).toString('base64url');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

function cookies(req) {
  const result = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

function cookie(req, key, value, maxAge) {
  const local = /^(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(req.headers.host || '');
  return `${key}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}` + (local ? '' : '; Secure');
}

function json(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function config() {
  const id = process.env.X_CLIENT_ID;
  const secret = process.env.X_CLIENT_SECRET;
  const callback = process.env.X_REDIRECT_URI;
  if (!id || !secret || !callback) return null;
  try {
    const parsed = new URL(callback);
    const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (parsed.pathname !== '/auth/x/callback' || (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:'))) {
      return null;
    }
    return { id, secret, callback, callbackUrl: parsed };
  } catch {
    return null;
  }
}

async function loggedInUser(req) {
  const value = cookies(req)[SESSION_NAME];
  if (!value || !/^[A-Za-z0-9_-]{40,70}$/.test(value)) return null;
  const db = await database();
  const result = await db.query(`
    SELECT x_user_id AS id, x_username AS username, x_name AS name,
      x_avatar_url AS profile_image_url
    FROM punk_x_login_sessions
    WHERE session_hash = $1 AND expires_at > NOW()
    LIMIT 1
  `, [hash(value)]);
  return result.rows[0] || null;
}

function requestIsCorrectOrigin(req, callbackUrl) {
  // Preview and published sites each need their own exact OAuth redirect URI.
  return (req.headers.host || '').toLowerCase() === callbackUrl.host.toLowerCase();
}

async function handleOAuth(req, res, url) {
  const path = url.pathname;
  const settings = config();

  if (path === '/api/x/me') {
    const session = cookies(req)[SESSION_NAME];
    return json(res, 200, {
      configured: !!settings,
      user: settings && session ? await loggedInUser(req) : null,
    });
  }

  if (path === '/api/x/logout') {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
    const origin = req.headers.origin;
    if (!origin || new URL(origin).host.toLowerCase() !== (req.headers.host || '').toLowerCase()) {
      return json(res, 403, { error: 'Origin check failed' });
    }
    const value = cookies(req)[SESSION_NAME];
    if (value) {
      const db = await database();
      await db.query('DELETE FROM punk_x_login_sessions WHERE session_hash = $1', [hash(value)]);
    }
    return json(res, 200, { ok: true }, {
      'Set-Cookie': cookie(req, SESSION_NAME, '', 0),
    });
  }

  if (!settings) return json(res, 503, { error: 'Configure X_CLIENT_ID, X_CLIENT_SECRET, X_REDIRECT_URI' });
  if (!requestIsCorrectOrigin(req, settings.callbackUrl)) {
    return json(res, 400, { error: 'Open PUNK on the exact X_REDIRECT_URI host' });
  }

  if (path === '/auth/x/start') {
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    const state = randomToken();
    const verifier = randomToken();
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    const db = await database();
    await db.query(`
      INSERT INTO punk_x_login_flows(state_hash, pkce_verifier, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '10 minutes')
    `, [hash(state), verifier]);
    const authorize = new URL('https://x.com/i/oauth2/authorize');
    for (const [key, value] of Object.entries({
      response_type: 'code', client_id: settings.id, redirect_uri: settings.callback,
      scope: 'users.read tweet.read', state,
      code_challenge: challenge, code_challenge_method: 'S256',
    })) authorize.searchParams.set(key, value);
    res.writeHead(302, {
      Location: authorize.toString(),
      'Cache-Control': 'no-store',
      'Set-Cookie': cookie(req, FLOW_NAME, state, 600),
    });
    return res.end();
  }

  if (path === '/auth/x/callback') {
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    const state = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    const saved = cookies(req)[FLOW_NAME];
    if (!state || !code || !saved || state !== saved ||
        !/^[A-Za-z0-9_-]{40,70}$/.test(state)) {
      return json(res, 400, { error: 'Missing or invalid OAuth state or authorization code' }, {
        'Set-Cookie': cookie(req, FLOW_NAME, '', 0),
      });
    }
    const db = await database();
    const flow = await db.query(`
      DELETE FROM punk_x_login_flows
      WHERE state_hash = $1 AND expires_at > NOW()
      RETURNING pkce_verifier
    `, [hash(state)]);
    if (!flow.rows.length) return json(res, 400, { error: 'Expired or reused OAuth state' });

    const body = new URLSearchParams({
      grant_type: 'authorization_code', code, redirect_uri: settings.callback,
      code_verifier: flow.rows[0].pkce_verifier,
    });
    const credentials = Buffer.from(settings.id + ':' + settings.secret).toString('base64');
    const tokenResult = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: AbortSignal.timeout(10000),
    });
    if (!tokenResult.ok) return json(res, 502, { error: 'X rejected the authorization code' });
    const token = await tokenResult.json();
    if (typeof token.access_token !== 'string') return json(res, 502, { error: 'X did not return a valid token' });

    const profileResult = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url', {
      headers: { Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!profileResult.ok) return json(res, 502, { error: 'X profile API rejected the request' });
    const profile = (await profileResult.json()).data;
    if (!profile?.id || !profile?.username) return json(res, 502, { error: 'X profile missing' });

    const session = randomToken();
    await db.query(`
      INSERT INTO punk_x_login_sessions
        (session_hash, x_user_id, x_username, x_name, x_avatar_url, expires_at)
      VALUES ($1,$2,$3,$4,$5,NOW() + INTERVAL '7 days')
    `, [hash(session), profile.id, profile.username,
      profile.name || profile.username, profile.profile_image_url || null]);
    res.writeHead(302, {
      Location: '/?x_connected=1',
      'Cache-Control': 'no-store',
      'Set-Cookie': [cookie(req, FLOW_NAME, '', 0), cookie(req, SESSION_NAME, session, SEVEN_DAYS)],
    });
    return res.end();
  }
}

async function handleStonk(req, res, url) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Read-only API: GET only' });
  let endpoint;
  if (url.pathname === '/api/stonk/pairs') {
    endpoint = '/pairs?launchable=true&launchLabReady=true';
  } else if (url.pathname === '/api/stonk/stats') {
    endpoint = '/stats';
  } else if (url.pathname === '/api/stonk/tokens') {
    const sort = url.searchParams.get('sort') || 'newest';
    if (!allowedSort.has(sort)) return json(res, 400, { error: 'Invalid sort' });
    endpoint = '/tokens?sort=' + encodeURIComponent(sort) + '&pageSize=25';
  } else {
    return json(res, 404, { error: 'Not found' });
  }

  const upstream = await fetch(STONK_BASE + endpoint, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  });
  const contentType = upstream.headers.get('content-type') || '';
  if (!contentType.includes('json')) {
    return json(res, 502, { error: 'StonkFun did not return JSON' });
  }
  const body = await upstream.json();
  return json(res, upstream.status, body, {
    'Cache-Control': upstream.ok ? 'public, max-age=15' : 'no-store',
    ...(upstream.status === 429 && upstream.headers.get('retry-after')
      ? { 'Retry-After': upstream.headers.get('retry-after') } : {}),
  });
}

export async function punkXStonkMiddleware(req, res, next) {
  let url;
  try { url = new URL(req.url || '/', 'http://localhost'); }
  catch { return next(); }

  // PUNK X STONK API V4: route diagnostics
  // Safe, public, no credentials or database details disclosed.
  if (url.pathname === '/api/punk/status') {
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    return json(res, 200, {
      ok: true,
      service: 'punk-express-or-vite',
      version: 'x-stonk-v4',
      xConfigured: !!config(),
      stonkProxy: 'configured',
      onChainLaunch: false,
    });
  }

  const oauthPaths = new Set(['/api/x/me', '/api/x/logout', '/auth/x/start', '/auth/x/callback']);
  const isX = oauthPaths.has(url.pathname);
  const isStonk = url.pathname.startsWith('/api/stonk/');
  if (!isX && !isStonk) return next();

  try {
    if (isX) return await handleOAuth(req, res, url);
    return await handleStonk(req, res, url);
  } catch (error) {
    console.error('PUNK X/Stonk integration:', error?.message || 'Unknown error');
    if (!res.headersSent) return json(res, 503, { error: 'Integration temporarily unavailable' });
  }
}
