/**
 * Production server (DigitalOcean App Platform "Web Service", or any Node 22+ host).
 *
 * Wraps the Astro Node adapter so that EVERY response — prerendered pages,
 * static assets and the /api/contact/ endpoint — gets the same security and
 * caching headers, and adds a /healthz endpoint for the platform's health
 * checks. Run after `npm run build`:  npm start
 */
import http from 'node:http';

// Let this file own the HTTP server instead of the adapter's standalone mode.
process.env.ASTRO_NODE_AUTOSTART = 'disabled';
const { handler } = await import('../dist/server/entry.mjs');

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '0.0.0.0';

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  // Scripts: own origin + the analytics vendors that load only after consent.
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net https://snap.licdn.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://www.googletagmanager.com https://www.google-analytics.com https://www.facebook.com https://px.ads.linkedin.com",
    "font-src 'self'",
    "connect-src 'self' https://www.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.facebook.com https://px.ads.linkedin.com",
    "frame-src https://www.googletagmanager.com",
    "worker-src 'self' blob:",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; '),
};

function cacheControl(url) {
  if (url.startsWith('/_astro/')) return null; // set by the adapter: immutable, 1 year
  if (url.startsWith('/api/')) return 'no-store';
  if (/\.(png|jpe?g|webp|avif|svg|ico|woff2?)$/i.test(url)) return 'public, max-age=604800';
  return 'public, max-age=0, must-revalidate';
}

const server = http.createServer((req, res) => {
  const url = req.url ?? '/';

  if (url === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
    res.end('ok');
    return;
  }

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
  const cache = cacheControl(url);
  if (cache) res.setHeader('Cache-Control', cache);

  handler(req, res);
});

server.keepAliveTimeout = 65_000; // longer than the platform load balancer's idle timeout
server.listen(PORT, HOST, () => console.log(`[atlaxys] listening on http://${HOST}:${PORT}`));

const shutdown = (signal) => {
  console.log(`[atlaxys] ${signal} received, closing server…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
