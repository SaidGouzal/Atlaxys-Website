/**
 * Page script for scripts/render-mark-stills.mjs: renders the finished 3D
 * mark once, with the production scene code, and hands back a PNG.
 */
import { createMarkScene } from '@/scripts/hero/mark/scene';
import type { Theme } from '@/scripts/hero/mark/materials';

const target = window as unknown as { renderMarkStill(theme: Theme, width: number, height: number): Promise<string> };

target.renderMarkStill = async (theme, width, height) => {
  const host = document.createElement('div');
  host.style.cssText = `position: relative; width: ${width}px; height: ${height}px;`;
  document.body.append(host);
  const scene = createMarkScene(host, { theme, rtl: false, coarse: false, still: true });
  await scene.ready;
  const pad = 0.03;
  scene.layout({ x: width * pad, y: height * pad, w: width * (1 - 2 * pad), h: height * (1 - 2 * pad) }, { x: 0, y: 0, w: width, h: height });
  // A little closer to head-on than the live rest pose, so it suits right-to-left pages too.
  const url = scene.renderStill({ rotX: 0.12, rotY: -0.32 });
  scene.destroy();
  host.remove();
  return url;
};
