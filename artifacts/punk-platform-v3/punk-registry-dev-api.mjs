
import pg from 'pg';

const { Pool } = pg;

export default function punkRegistryDevApi() {
  let pool;

  async function handler(req, res, next) {
    const pathname = new URL(
      req.url || '/',
      'http://localhost'
    ).pathname;

    if (
      pathname !== '/api/tokens' &&
      !pathname.startsWith('/api/tokens/')
    ) {
      return next();
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'GET') {
      res.statusCode = 405;
      return res.end(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }));
    }

    if (!process.env.DATABASE_URL) {
      res.statusCode = 503;
      return res.end(JSON.stringify({
        success: false,
        error: 'Database not configured'
      }));
    }

    try {
      if (!pool) {
        pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          max: 3,
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 30000
        });
      }

      const fields = `
        token_id, name, ticker, description,
        image_url, creator_id, total_supply,
        status, created_at
      `;

      if (pathname === '/api/tokens') {
        const result = await pool.query(`
          SELECT ${fields}
          FROM punk_tokens
          WHERE status = 'active'
          ORDER BY created_at DESC
          LIMIT 100
        `);

        res.statusCode = 200;
        return res.end(JSON.stringify({
          success: true,
          tokens: result.rows
        }));
      }

      const id = decodeURIComponent(
        pathname.slice('/api/tokens/'.length)
      );

      if (!/^PUNK-[A-Z0-9]{6,24}$/.test(id)) {
        res.statusCode = 400;
        return res.end(JSON.stringify({
          success: false,
          error: 'Invalid token ID'
        }));
      }

      const result = await pool.query(
        `SELECT ${fields}
         FROM punk_tokens
         WHERE token_id = $1
         AND status = 'active'
         LIMIT 1`,
        [id]
      );

      if (!result.rows.length) {
        res.statusCode = 404;
        return res.end(JSON.stringify({
          success: false,
          error: 'Token not found'
        }));
      }

      res.statusCode = 200;
      return res.end(JSON.stringify({
        success: true,
        token: result.rows[0]
      }));

    } catch (error) {
      console.error(
        'PUNK registry API:',
        error.message
      );

      res.statusCode = 503;
      return res.end(JSON.stringify({
        success: false,
        error: 'Registry unavailable'
      }));
    }
  }

  return {
    name: 'punk-registry-development-api',
    apply: 'serve',

    configureServer(server) {
      server.middlewares.use(handler);
    },

    configurePreviewServer(server) {
      server.middlewares.use(handler);
    }
  };
}
