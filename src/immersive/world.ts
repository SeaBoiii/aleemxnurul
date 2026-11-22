/**
 * The 3D world, laid out once: stars in the order the sites were made, the Silver River as a
 * ribbon of particles, and the camera route that flies past every star.
 *
 * three.js axes: x right, y up, the flight goes toward −z. Each constellation keeps its real
 * shape (gnomonic projection of J2000 positions about its own centre) but is magnified to fill
 * its stretch of the flight, and every star sits a little deeper than the one before it so the
 * route only ever moves forward.
 */
import { CatmullRomCurve3, Vector3 } from 'three';
import sky from '../data/sky.json';

export type WorldStar = {
  key: string; name: string; designation: string; constellation: string;
  month: string; status: string; revealOn?: string;
  position: Vector3; index: number;
};

const rad = (deg: number) => deg * Math.PI / 180;

function project(ra: number, dec: number, ra0: number, dec0: number) {
  const a = rad(ra - ra0), d = rad(dec), c = rad(dec0);
  const den = Math.sin(c) * Math.sin(d) + Math.cos(c) * Math.cos(d) * Math.cos(a);
  return { x: -Math.cos(d) * Math.sin(a) / den, y: (Math.cos(c) * Math.sin(d) - Math.sin(c) * Math.cos(d) * Math.cos(a)) / den };
}

/** Where each constellation sits in the world, and how big. */
const PLACEMENT: Record<string, { centre: [number, number]; size: number }> = {
  Aquila: { centre: [2, -1], size: 24 },
  Lyra: { centre: [-9, 3], size: 20 },
  Cygnus: { centre: [10, 5], size: 26 },
};

const STEP = 26;          // depth between consecutive stars
const START = -36;        // the first star (Altair)
export const RIVER_GAP = 34;     // extra depth for crossing the river after Aquila
const SWAN_GAP = 18;      // a breath before Cygnus

function layout(): WorldStar[] {
  const all = [...sky.stars, ...sky.extras];
  const byConstellation = new Map<string, typeof all>();
  for (const star of all) byConstellation.set(star.constellation, [...(byConstellation.get(star.constellation) ?? []), star]);
  const flat = new Map<string, { x: number; y: number }>();
  for (const [name, members] of byConstellation) {
    const ra0 = members.reduce((s, m) => s + m.ra, 0) / members.length;
    const dec0 = members.reduce((s, m) => s + m.dec, 0) / members.length;
    const pts = members.map((m) => project(m.ra, m.dec, ra0, dec0));
    const span = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x)), height = Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y));
    const scale = PLACEMENT[name].size / Math.max(span, height);
    const cx = (Math.max(...pts.map((p) => p.x)) + Math.min(...pts.map((p) => p.x))) / 2;
    const cy = (Math.max(...pts.map((p) => p.y)) + Math.min(...pts.map((p) => p.y))) / 2;
    members.forEach((m, i) => flat.set(m.key, { x: PLACEMENT[name].centre[0] + (pts[i].x - cx) * scale, y: PLACEMENT[name].centre[1] + (pts[i].y - cy) * scale }));
  }
  let z = START;
  return sky.stars.map((star, index) => {
    if (index > 0) z -= STEP + (star.constellation !== sky.stars[index - 1].constellation ? (star.constellation === 'Lyra' ? RIVER_GAP : SWAN_GAP) : 0);
    const p = flat.get(star.key)!;
    return { ...star, index, position: new Vector3(p.x, p.y, z) };
  });
}

export const stars = layout();
const last = stars[stars.length - 1].position.z;

/** Deneb, the bridge, and Aljanah, the next star, sit beyond the last site, inside the river. */
export const deneb = new Vector3(4, 9, last - 46);
export const aljanah = new Vector3(19, 1, last - 14);
export const sealPoint = new Vector3(0, 6, deneb.z - 34);

/** Lines of each figure, by star key. */
export const figureLines: [string, string][] = Object.values(sky.figures).flat() as [string, string][];
export function positionOf(key: string): Vector3 | undefined {
  if (key === 'deneb') return deneb;
  if (key === 'aljanah') return aljanah;
  return stars.find((s) => s.key === key)?.position;
}

/**
 * The Silver River: it comes in from far away on the left, crosses the route between Aquila
 * and Lyra, swings out right past Lyra, then turns back so Cygnus swims inside it and Deneb
 * sits in its stream.
 */
const crossingZ = stars[4].position.z - (STEP + RIVER_GAP) / 2;
export const river = new CatmullRomCurve3([
  new Vector3(-170, -60, crossingZ + 120),
  new Vector3(-70, -22, crossingZ + 40),
  new Vector3(0, 0, crossingZ),
  new Vector3(34, 8, crossingZ - 60),
  new Vector3(44, 10, stars[10].position.z - 10),
  new Vector3(16, 6, stars[12].position.z),
  new Vector3(4, 8, deneb.z),
  new Vector3(-30, 14, deneb.z - 140),
], false, 'catmullrom', 0.4);
export const crossing = new Vector3(0, 0, crossingZ);

/**
 * The camera route: a calm start, then a waypoint just in front of and beside each star, so
 * the star slides past off-centre, then on through the river to Deneb and the seal.
 */
const beside = (p: Vector3, i: number) => new Vector3(p.x * 0.55 + (i % 2 ? 2.6 : -2.6), p.y * 0.5 - 1.2, p.z + 11);
export const routePoints = [
  new Vector3(0, 0, 34),
  new Vector3(0, 1, 6),
  ...stars.slice(0, 5).map((s, i) => beside(s.position, i)),
  crossing.clone().add(new Vector3(0, 1.5, 6)),
  crossing.clone().add(new Vector3(-2, 2, -14)),
  ...stars.slice(5, 11).map((s, i) => beside(s.position, i + 5)),
  ...stars.slice(11).map((s, i) => beside(s.position, i + 11)),
  deneb.clone().add(new Vector3(0, -2, 24)),
  sealPoint.clone().add(new Vector3(0, 0, 9)),
];
export const route = new CatmullRomCurve3(routePoints, false, 'centripetal');

/** Fraction of the route at which the camera is beside star i (for syncing the chapters). */
function nearestT(target: Vector3) {
  let best = 0, bestD = Infinity;
  for (let i = 0; i <= 2000; i++) {
    const d = route.getPointAt(i / 2000).distanceToSquared(target);
    if (d < bestD) { bestD = d; best = i / 2000; }
  }
  return best;
}
export const starT = stars.map((s, i) => nearestT(beside(s.position, i)));
export const crossingT = nearestT(crossing.clone().add(new Vector3(0, 1.5, 6)));
export const denebT = nearestT(deneb.clone().add(new Vector3(0, -2, 24)));
