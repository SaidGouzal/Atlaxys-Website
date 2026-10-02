/**
 * Renders the still images of the 3D hero mark (the fallback shown without
 * JavaScript, with reduced motion and on devices that skip WebGL) with the
 * production scene code, so the still always matches the 3D version.
 *
 *   npm run brand:mark-stills
 *
 * Writes src/assets/brand/mark-3d-{dark,light}.png (1500 × 1000, transparent).
 * Needs Playwright's Chromium (the same one the audit scripts use).
 * Re-run after changing the mark's geometry, materials or studio.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'src/assets/brand');
const SIZE = { width: 1500, height: 1000 };
const SUPERSAMPLE = 2;

const server = await createServer({
  configFile: false,
  root: path.join(root, 'scripts/mark-stills'),
  logLevel: 'warn',
  resolve: { alias: { '@': path.join(root, 'src') } },
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root] } },
});
await server.listen();
const { port } = server.httpServer.address();

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => console.error(error));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => typeof window.renderMarkStill === 'function');
  for (const theme of ['dark', 'light']) {
    const url = await page.evaluate(
      ([t, w, h]) => window.renderMarkStill(t, w, h),
      [theme, SIZE.width * SUPERSAMPLE, SIZE.height * SUPERSAMPLE],
    );
    const file = path.join(OUT, `mark-3d-${theme}.png`);
    await sharp(Buffer.from(url.split(',')[1], 'base64'))
      .resize(SIZE.width, SIZE.height, { kernel: 'lanczos3' })
      .png({ compressionLevel: 9, effort: 10, palette: false })
      .toFile(file);
    console.log(`✓ ${path.relative(root, file)}`);
  }
} finally {
  await browser.close();
  await server.close();
}
