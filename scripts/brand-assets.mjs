/**
 * Brand asset pipeline.
 *
 * Generates every derived logo file (transparent logo, favicons, PWA icons,
 * default social image) from the two official source files in
 * `src/assets/brand/source/`. The logo artwork itself is never redrawn: we
 * crop it, remove the flat background, place it on a canvas, and for light
 * backgrounds swap its white/steel letters for ink (the orange X and every
 * shape stay exactly as drawn).
 *
 * Run after replacing the source logo files:
 *   npm run brand:assets
 */
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const SRC = 'src/assets/brand/source';
const OUT_SRC = 'src/assets/brand';
const OUT_PUBLIC = 'public';
const INK = { r: 8, g: 9, b: 11 }; // --color-ink-950 (#08090B)

/**
 * Remove a flat dark background ("colour to alpha"), keeping anti-aliased
 * edges and soft glows intact.
 */
async function colorToAlpha(input, bg, crop) {
  const { data, info } = await sharp(input)
    .extract(crop)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const px = [data[i], data[i + 1], data[i + 2]];
    const bgc = [bg.r, bg.g, bg.b];
    let alpha = 0;
    for (let c = 0; c < 3; c++) {
      // The key colour is near-black, so only pixels lighter than it carry artwork.
      alpha = Math.max(alpha, Math.max(0, px[c] - bgc[c]) / (255 - bgc[c]));
    }
    // Levels adjustment: drops lossy-compression noise in the flat background
    // while keeping anti-aliased edges and the orange glow.
    alpha = Math.max(0, Math.min(1, (alpha - 0.09) / 0.91));
    for (let c = 0; c < 3; c++) {
      const v = alpha > 0 ? bgc[c] + (px[c] - bgc[c]) / alpha : 0;
      out[j + c] = Math.max(0, Math.min(255, Math.round(v)));
    }
    out[j + 3] = Math.round(alpha * 255);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png();
}

/**
 * Logo for light backgrounds: neutral (white / steel) pixels become ink, with
 * the letters' subtle steel gradient kept as a gradient of inks. Coloured
 * pixels (the orange X) and alpha are left exactly as they are.
 */
async function inkVariant(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const dark = [17, 20, 26]; // --paper-ink
  const soft = [58, 65, 76]; // lighter steel in the source → slightly lighter ink
  const smooth = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    const neutral = 1 - smooth(40, 90, chroma);
    if (neutral <= 0) continue;
    const t = Math.max(0, Math.min(1, (255 - (r + g + b) / 3) / 90));
    for (let c = 0; c < 3; c++) {
      const ink = dark[c] + (soft[c] - dark[c]) * t;
      out[i + c] = Math.round(data[i + c] * (1 - neutral) + ink * neutral);
    }
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** Minimal ICO container wrapping PNG payloads (supported by every modern browser). */
function pngsToIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, buffer }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(buffer.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += buffer.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.buffer)]);
}

/** Rounded-square dark tile with the mark centred inside. */
async function iconTile(mark, size, { padding = 0.16, radius = 0.22, fullBleed = false } = {}) {
  const inner = Math.round(size * (1 - padding * 2));
  const markBuf = await sharp(mark).resize({ width: inner, height: inner, fit: 'inside' }).toBuffer();
  const meta = await sharp(markBuf).metadata();
  const r = fullBleed ? 0 : Math.round(size * radius);
  const tile = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="rgb(${INK.r},${INK.g},${INK.b})"/></svg>`,
  );
  return sharp(tile)
    .composite([
      {
        input: markBuf,
        left: Math.round((size - meta.width) / 2),
        top: Math.round((size - meta.height) / 2),
      },
    ])
    .png();
}

/** Deterministic circuit-trace pattern (same visual language as the site hero). */
function tracePattern(width, height, seed = 7) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const step = 30;
  const paths = [];
  const nodes = [];
  for (let t = 0; t < 22; t++) {
    let x = Math.round((width * 0.52 + rand() * width * 0.2) / step) * step;
    let y = Math.round((40 + rand() * (height - 80)) / step) * step;
    let d = `M${x} ${y}`;
    let dir = 0;
    for (let seg = 0; seg < 4; seg++) {
      const len = (2 + Math.floor(rand() * 5)) * step;
      const dy = dir === 0 ? 0 : dir * len;
      x += len;
      y = Math.max(20, Math.min(height - 20, y + dy));
      d += ` L${x} ${y}`;
      dir = dir === 0 ? (rand() > 0.5 ? 1 : -1) : 0;
    }
    const hot = t % 6 === 0;
    paths.push(
      `<path d="${d}" fill="none" stroke="${hot ? '#FF8828' : '#C3CBD5'}" stroke-opacity="${hot ? 0.85 : 0.16}" stroke-width="2"/>`,
    );
    nodes.push(
      `<circle cx="${x}" cy="${y}" r="6" fill="none" stroke="${hot ? '#FF8828' : '#C3CBD5'}" stroke-opacity="${hot ? 0.9 : 0.25}" stroke-width="2"/>`,
    );
  }
  let dots = '';
  for (let gx = step; gx < width; gx += step) {
    for (let gy = step; gy < height; gy += step) {
      dots += `<circle cx="${gx}" cy="${gy}" r="1.2" fill="#C3CBD5" fill-opacity="0.08"/>`;
    }
  }
  return `${dots}${paths.join('')}${nodes.join('')}`;
}

async function main() {
  await mkdir(`${OUT_PUBLIC}/icons`, { recursive: true });
  await mkdir(`${OUT_PUBLIC}/brand`, { recursive: true });
  await mkdir(`${OUT_PUBLIC}/og`, { recursive: true });

  // 1. Horizontal lockup (wordmark) — trimmed, transparent.
  const wordmark = await colorToAlpha(`${SRC}/atlaxys-wordmark.webp`, { r: 12, g: 13, b: 15 }, {
    left: 214,
    top: 145,
    width: 1572,
    height: 368,
  });
  const wordmarkBuf = await wordmark.toBuffer();
  await writeFile(`${OUT_SRC}/atlaxys-wordmark.png`, wordmarkBuf);
  await writeFile(`${OUT_PUBLIC}/brand/atlaxys-wordmark.png`, wordmarkBuf);
  // Same lockup for light backgrounds (light theme, paper sections).
  await writeFile(`${OUT_SRC}/atlaxys-wordmark-ink.png`, await inkVariant(wordmarkBuf));

  // 2. "A" symbol — cropped from the app icon, transparent.
  const mark = await colorToAlpha(`${SRC}/atlaxys-app-icon.webp`, { r: 3, g: 5, b: 7 }, {
    left: 290,
    top: 222,
    width: 808,
    height: 508,
  });
  const markBuf = await mark.toBuffer();
  await writeFile(`${OUT_SRC}/atlaxys-mark.png`, markBuf);

  // 3. Favicons & PWA icons.
  const sizes = { 'favicon-16.png': 16, 'favicon-32.png': 32, 'favicon-48.png': 48 };
  const icoParts = [];
  for (const [name, size] of Object.entries(sizes)) {
    const buffer = await (await iconTile(markBuf, size, { padding: 0.08, radius: 0.18 })).toBuffer();
    await writeFile(`${OUT_PUBLIC}/icons/${name}`, buffer);
    icoParts.push({ size, buffer });
  }
  await writeFile(`${OUT_PUBLIC}/favicon.ico`, pngsToIco(icoParts));
  await writeFile(
    `${OUT_PUBLIC}/apple-touch-icon.png`,
    await (await iconTile(markBuf, 180, { padding: 0.14, fullBleed: true })).toBuffer(),
  );
  await writeFile(`${OUT_PUBLIC}/icons/icon-192.png`, await (await iconTile(markBuf, 192)).toBuffer());
  await writeFile(`${OUT_PUBLIC}/icons/icon-512.png`, await (await iconTile(markBuf, 512)).toBuffer());
  await writeFile(
    `${OUT_PUBLIC}/icons/icon-maskable-512.png`,
    await (await iconTile(markBuf, 512, { padding: 0.24, fullBleed: true })).toBuffer(),
  );

  // 4. Official app icon, untouched apart from resizing (used by structured data).
  await sharp(`${SRC}/atlaxys-app-icon.webp`).resize(512, 512).png().toFile(`${OUT_PUBLIC}/brand/atlaxys-logo-512.png`);

  // 5. Default Open Graph image (1200×630).
  const W = 1200;
  const H = 630;
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>
        <radialGradient id="g" cx="78%" cy="50%" r="60%">
          <stop offset="0" stop-color="#FE6E02" stop-opacity="0.10"/>
          <stop offset="1" stop-color="#FE6E02" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="#08090B"/>
      <rect width="${W}" height="${H}" fill="url(#g)"/>
      ${tracePattern(W, H)}
      <rect x="0" y="${H - 6}" width="${W}" height="6" fill="#FF8828"/>
    </svg>`,
  );
  const lockup = await sharp(wordmarkBuf).resize({ width: 560 }).toBuffer();
  const lockupMeta = await sharp(lockup).metadata();
  await sharp(bg)
    .composite([{ input: lockup, left: 80, top: Math.round((H - lockupMeta.height) / 2) }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(`${OUT_PUBLIC}/og/atlaxys-default.jpg`);

  console.log('Brand assets generated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
