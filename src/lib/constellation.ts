/** J2000/ICRS positions, degrees. Named stars: IAU WGSN catalogue;
 * other positions: CDS SIMBAD, cross-checked against CAB/INTA-CSIC SASDABA.
 * https://iauarchive.eso.org/public/themes/naming_stars/
 * https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Altair
 * https://sdc.cab.inta-csic.es/sasdaba/jsp/result.jsp?origen=-
 * The same uniform gnomonic projection drives stars, lines, flight and OG art.
 */
export type SkyStar = {
  name: string; designation: string; constellation: 'Aquila' | 'Lyra' | 'Cygnus';
  ra: number; dec: number; x: number; y: number;
};
const catalogue: Omit<SkyStar, 'x' | 'y'>[] = [
  { name: 'Altair', designation: 'α Aquilae', constellation: 'Aquila', ra: 297.695827, dec: 8.868321 },
  { name: 'Tarazed', designation: 'γ Aquilae', constellation: 'Aquila', ra: 296.564915, dec: 10.613262 },
  { name: 'Alshain', designation: 'β Aquilae', constellation: 'Aquila', ra: 298.828304, dec: 6.406763 },
  { name: 'δ Aquilae', designation: 'δ Aquilae', constellation: 'Aquila', ra: 291.374589, dec: 3.114779 },
  { name: 'Okab', designation: 'ζ Aquilae', constellation: 'Aquila', ra: 286.352533, dec: 13.863477 },
  { name: 'Sheliak', designation: 'β Lyrae', constellation: 'Lyra', ra: 282.519978, dec: 33.362668 },
  { name: 'Sulafat', designation: 'γ Lyrae', constellation: 'Lyra', ra: 284.735928, dec: 32.689557 },
  { name: 'δ² Lyrae', designation: 'δ² Lyrae', constellation: 'Lyra', ra: 283.626178, dec: 36.898620 },
  { name: 'ζ¹ Lyrae', designation: 'ζ¹ Lyrae', constellation: 'Lyra', ra: 281.193160, dec: 37.605120 },
  { name: 'ε Lyrae', designation: 'ε Lyrae · the Double Double', constellation: 'Lyra', ra: 281.084775, dec: 39.670126 },
  { name: 'Vega', designation: 'α Lyrae', constellation: 'Lyra', ra: 279.234735, dec: 38.783689 },
  { name: 'Fawaris', designation: 'δ Cygni', constellation: 'Cygnus', ra: 296.243663, dec: 45.130810 },
  { name: 'Sadr', designation: 'γ Cygni', constellation: 'Cygnus', ra: 305.557091, dec: 40.256679 },
  { name: 'Albireo', designation: 'β Cygni · gold and blue', constellation: 'Cygnus', ra: 292.680351, dec: 27.959681 },
  { name: 'Deneb', designation: 'α Cygni', constellation: 'Cygnus', ra: 310.357980, dec: 45.280339 },
];
export const mapWidth = 390;
export const mapHeight = 700;
const radians = (degrees: number) => degrees * Math.PI / 180;
const rotation = radians(20);

/** Gnomonic projection about a constellation's own centre, rotated so the river runs diagonally. */
function project(ra: number, dec: number, centreRA: number, centreDec: number) {
  const a = radians(ra - centreRA), d = radians(dec), c = radians(centreDec);
  const denominator = Math.sin(c) * Math.sin(d) + Math.cos(c) * Math.cos(d) * Math.cos(a);
  const east = -Math.cos(d) * Math.sin(a) / denominator;
  const north = -(Math.cos(c) * Math.sin(d) - Math.sin(c) * Math.cos(d) * Math.cos(a)) / denominator;
  return { x: east * Math.cos(rotation) - north * Math.sin(rotation), y: east * Math.sin(rotation) + north * Math.cos(rotation) };
}

/** Real shapes, magnified separately (Lyra is tiny next to Aquila): each figure fills its own box. */
function place(indices: number[], box: { left: number; top: number; width: number; height: number }) {
  const members = indices.map((index) => catalogue[index]);
  const ra = members.reduce((sum, star) => sum + star.ra, 0) / members.length;
  const dec = members.reduce((sum, star) => sum + star.dec, 0) / members.length;
  const points = members.map((star) => project(star.ra, star.dec, ra, dec));
  const minX = Math.min(...points.map((p) => p.x)), maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y)), maxY = Math.max(...points.map((p) => p.y));
  const scale = Math.min(box.width / (maxX - minX), box.height / (maxY - minY));
  return points.map((p) => ({
    x: Math.round(box.left + box.width / 2 + (p.x - (minX + maxX) / 2) * scale),
    y: Math.round(box.top + box.height / 2 + (p.y - (minY + maxY) / 2) * scale),
  }));
}
const aquila = place([0, 1, 2, 3, 4], { left: 34, top: 465, width: 240, height: 205 });
const lyra = place([5, 6, 7, 8, 9, 10], { left: 140, top: 200, width: 150, height: 205 });
// The Swan flies above them, in the river, with Deneb at its tail.
const cygnus = place([11, 12, 13, 14], { left: 24, top: 46, width: 250, height: 150 });
const positions = [...aquila, ...lyra, ...cygnus];
const stars = catalogue.map((star, index) => ({ ...star, ...positions[index] }));
export const starMap: SkyStar[] = stars.slice(0, 14);
export const deneb = stars[14];
export const points = starMap.map(({ x, y }) => [x, y]);
// Aquila's spine and wing; Lyra's parallelogram and Vega–ε–ζ triangle.
export const figureEdges: [number, number][] = [[2, 0], [0, 1], [0, 3], [3, 4], [5, 6], [6, 7], [7, 8], [8, 5], [10, 9], [9, 8], [8, 10], [11, 12], [12, 13]];
/** Vega back into the river, to the Swan: the second crossing. */
export const swanCrossing: [number, number] = [10, 11];
export const crossing: [number, number] = [4, 5];
export const linePath = (from: number, to: number) => `M${stars[from].x} ${stars[from].y} L${stars[to].x} ${stars[to].y}`;
export const summerTriangle = `M${stars[10].x} ${stars[10].y} L${stars[0].x} ${stars[0].y} L${deneb.x} ${deneb.y} Z`;
// The magpie bridge arcs out over the open river, clear of Lyra and its labels.
const [altair, vega] = [stars[0], stars[10]];
const bow = { x: (altair.x + vega.x) / 2 + 140, y: (altair.y + vega.y) / 2 + 90 };
export const bridgePath = `M${altair.x} ${altair.y} Q${bow.x} ${bow.y} ${vega.x} ${vega.y}`;
export const bridgePoint = (t: number) => ({
  x: (1 - t) ** 2 * altair.x + 2 * (1 - t) * t * bow.x + t ** 2 * vega.x,
  y: (1 - t) ** 2 * altair.y + 2 * (1 - t) * t * bow.y + t ** 2 * vega.y,
});

/** Shortest walk along the actual figure lines, with one crossing of the river. */
export function flightRoute(from: number, to: number): number[] {
  const queue: number[][] = [[from]], seen = new Set([from]);
  const edges = [...figureEdges, crossing, swanCrossing];
  while (queue.length) {
    const route = queue.shift()!;
    const node = route[route.length - 1];
    if (node === to) return route;
    edges.forEach(([a, b]) => {
      const next = a === node ? b : b === node ? a : -1;
      if (next >= 0 && !seen.has(next)) { seen.add(next); queue.push([...route, next]); }
    });
  }
  return [from, to];
}

// The opening letter's dotted trail follows the same graph as later flights.
const journey = [0];
starMap.slice(1).forEach((_, index) => journey.push(...flightRoute(index, index + 1).slice(1)));
export const arrivalPath = journey.map((index, step) => `${step ? 'L' : 'M'}${starMap[index].x} ${starMap[index].y}`).join(' ');

// Which side of its star each label sits on, tuned so the Lyra cluster never collides.
export const labelSide: ('left' | 'right' | 'right-low' | 'above' | 'below' | 'below-start')[] = ['right-low', 'above', 'below-start', 'right', 'right', 'below', 'left', 'left', 'below', 'above', 'right', 'right', 'below', 'right'];
