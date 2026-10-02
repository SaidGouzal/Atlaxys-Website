/**
 * A procedural photo studio, baked once into a pre-filtered environment map
 * (PMREM). Metal gets its whole look from what it reflects, so this is what
 * makes the steel read as steel — with no HDR file to download.
 *
 *   • a tall wall of softboxes in front: the faces of the mark reflect it,
 *     brighter at the top (the logo's white-to-steel gradient);
 *   • strip lights between and behind: long highlights on the chamfers and
 *     the silhouette;
 *   • a warm bounce from below: orange glints on the lower chamfers, as if
 *     the blade were lighting the steel.
 *
 * Dark theme: black studio, bright boxes. Light theme: pale studio, so the
 * graphite steel reads like anodised metal.
 */
import { Color, DoubleSide, Mesh, MeshBasicMaterial, PMREMGenerator, PlaneGeometry, Scene, type Texture, type WebGLRenderer } from 'three';
import type { Theme } from './materials';

interface Panel {
  /** Azimuth around the mark in degrees (0 = towards the viewer, positive = viewer's right). */
  angle: number;
  /** Elevation of the panel's centre, degrees. */
  elevation: number;
  /** Angular size, degrees. */
  width: number;
  height: number;
  intensity: number;
  color?: string;
}

const PANELS: Panel[] = [
  // Front wall, upper and lower halves.
  { angle: -25, elevation: 18, width: 170, height: 34, intensity: 1.35 },
  { angle: -25, elevation: -14, width: 170, height: 30, intensity: 0.66 },
  // Studio floor, below a darker band (a horizon line in the metal): faces tilted
  // down — the exploded view seen from above — still find light.
  { angle: -20, elevation: -48, width: 170, height: 26, intensity: 0.34 },
  // Strips across the wall: streaks that travel over the faces as the light follows the pointer.
  { angle: -88, elevation: 4, width: 6, height: 80, intensity: 2.6 },
  { angle: -52, elevation: 4, width: 7, height: 80, intensity: 3.2 },
  { angle: -8, elevation: 6, width: 4, height: 80, intensity: 2.6 },
  { angle: 34, elevation: 4, width: 9, height: 80, intensity: 3.6 },
  // Overhead softbox.
  { angle: 0, elevation: 62, width: 70, height: 30, intensity: 1.6 },
  // Rim strips behind.
  { angle: 128, elevation: 8, width: 6, height: 70, intensity: 4 },
  { angle: -132, elevation: 8, width: 6, height: 70, intensity: 3.4 },
  // Warm bounce from below.
  { angle: 10, elevation: -70, width: 90, height: 18, intensity: 0.55, color: '#ff6a10' },
];

const STUDIO: Record<Theme, { background: string; gain: number }> = {
  dark: { background: '#040506', gain: 0.78 },
  light: { background: '#aab3be', gain: 1.25 },
};

export function bakeStudio(renderer: WebGLRenderer, theme: Theme): { texture: Texture; dispose(): void } {
  const { background, gain } = STUDIO[theme];
  const scene = new Scene();
  scene.background = new Color(background);
  const geometry = new PlaneGeometry(1, 1);
  const materials: MeshBasicMaterial[] = [];
  const r = 10;
  const rad = Math.PI / 180;

  for (const panel of PANELS) {
    const material = new MeshBasicMaterial({
      color: new Color(panel.color ?? '#ffffff').multiplyScalar(panel.intensity * gain),
      side: DoubleSide,
    });
    materials.push(material);
    const mesh = new Mesh(geometry, material);
    const a = panel.angle * rad;
    const e = panel.elevation * rad;
    mesh.position.set(Math.sin(a) * Math.cos(e) * r, Math.sin(e) * r, Math.cos(a) * Math.cos(e) * r);
    mesh.lookAt(0, 0, 0);
    // Angular size → size on a sphere of radius r (chord).
    mesh.scale.set(2 * r * Math.sin((panel.width * rad) / 2), 2 * r * Math.sin((panel.height * rad) / 2), 1);
    scene.add(mesh);
  }

  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.02);
  pmrem.dispose();
  geometry.dispose();
  materials.forEach((m) => m.dispose());
  return { texture: target.texture, dispose: () => target.dispose() };
}
