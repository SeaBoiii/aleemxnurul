import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, MathUtils, Mesh, MeshStandardMaterial,
  Object3D, PlaneGeometry, Points, Quaternion, ShaderMaterial, SRGBColorSpace, Texture, TextureLoader, Vector3, VideoTexture,
} from 'three';
import { aljanah, deneb, figureLines, positionOf, river, route, sealPoint, starT, stars } from './world';
import { flight } from './flight';
import { canStream } from './network';

const NIGHT = new Color('#04121D');
const small = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 700;

/* ------------------------------------------------------------------ shaders */

const pointVertex = /* glsl */ `
  attribute float size;
  attribute vec3 tint;
  attribute float phase;
  uniform float time;
  uniform float pixelRatio;
  uniform float attenuate;
  uniform float reach;
  uniform vec2 nearFade;
  varying vec3 vTint;
  varying float vTwinkle;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vTwinkle = 0.75 + 0.25 * sin(time * (0.6 + phase * 1.7) + phase * 40.0);
    float s = size * pixelRatio * vTwinkle;
    gl_PointSize = attenuate > 0.5 ? clamp(s * (reach / -mv.z), 1.5, 420.0) : s;
    // Fade what passes very close, so dust never becomes a blurry ball across the lens.
    vTint = tint * (nearFade.y > 0.0 ? smoothstep(nearFade.x, nearFade.y, -mv.z) : 1.0);
  }
`;
const pointFragment = /* glsl */ `
  uniform float softness;
  varying vec3 vTint;
  varying float vTwinkle;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    float core = smoothstep(1.0, 0.0, d);
    float a = mix(core * core * core, core, softness);
    if (a < 0.01) discard;
    gl_FragColor = vec4(vTint * a * vTwinkle, a);
  }
`;
/** A bright star: soft core plus four long spikes, the same look as the Blender keyframes. */
const starFragment = /* glsl */ `
  varying vec3 vTint;
  varying float vTwinkle;
  void main() {
    vec2 c = (gl_PointCoord - 0.5) * 2.0;
    float r = length(c);
    float core = exp(-r * r * 22.0) * 1.6 + exp(-r * r * 4.0) * 0.35;
    vec2 rc = vec2(c.x + c.y, c.x - c.y) * 0.7071;
    float spikes = exp(-abs(rc.x) * 38.0) * exp(-abs(rc.y) * 2.6) + exp(-abs(rc.y) * 38.0) * exp(-abs(rc.x) * 2.6);
    float a = clamp(core + spikes * 0.7, 0.0, 1.0) * smoothstep(1.0, 0.85, r);
    if (a < 0.01) discard;
    gl_FragColor = vec4(vTint * a * vTwinkle, a);
  }
`;

function pointsMaterial(opts: { attenuate: boolean; softness: number; star?: boolean; reach?: number; nearFade?: [number, number] }) {
  return new ShaderMaterial({
    uniforms: { time: { value: 0 }, pixelRatio: { value: Math.min(window.devicePixelRatio, 1.75) }, attenuate: { value: opts.attenuate ? 1 : 0 }, softness: { value: opts.softness }, reach: { value: opts.reach ?? 60 }, nearFade: { value: opts.nearFade ?? [0, 0] } },
    vertexShader: pointVertex,
    fragmentShader: opts.star ? starFragment : pointFragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

function geometry(positions: Float32Array, sizes: Float32Array, tints: Float32Array) {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(positions, 3));
  g.setAttribute('size', new BufferAttribute(sizes, 1));
  g.setAttribute('tint', new BufferAttribute(tints, 3));
  const phase = new Float32Array(sizes.length).map(() => Math.random());
  g.setAttribute('phase', new BufferAttribute(phase, 1));
  return g;
}

function useTime(material: ShaderMaterial) {
  useFrame((_, dt) => { material.uniforms.time.value += dt; });
}

/* ------------------------------------------------------------------ the sky */

function Starfield() {
  const count = small ? 3200 : 6400;
  const [geo, mat] = useMemo(() => {
    const pos = new Float32Array(count * 3), size = new Float32Array(count), tint = new Float32Array(count * 3);
    const v = new Vector3(), mid = route.getPointAt(0.5).z;
    for (let i = 0; i < count; i++) {
      // Two thirds on a far dome, a third in a nearer shell around the route for parallax.
      const near = i % 3 === 0;
      v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(near ? 120 + Math.random() * 260 : 900);
      pos.set([v.x, v.y, v.z + (near ? route.getPointAt(Math.random()).z : mid)], i * 3);
      size[i] = (near ? 1.6 : 1.4) + Math.pow(Math.random(), 5) * 3.6;
      const warm = Math.random() > 0.5, b = 0.75 + Math.random() * 0.5;
      tint.set(warm ? [b, b * 0.9, b * 0.78] : [b * 0.8, b * 0.88, b], i * 3);
    }
    return [geometry(pos, size, tint), pointsMaterial({ attenuate: false, softness: 1 })];
  }, [count]);
  useTime(mat);
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

/** The Silver River: a flattened ribbon of dust and stars following its curve. */
function River() {
  const count = small ? 16000 : 38000;
  const [geo, mat] = useMemo(() => {
    const pos = new Float32Array(count * 3), size = new Float32Array(count), tint = new Float32Array(count * 3);
    const navy = new Color('#3d5f9e'), blush = new Color('#b98393'), gold = new Color('#f1ddb0'), white = new Color('#e9eefc');
    const up = new Vector3(0, 1, 0), n = new Vector3(), b = new Vector3(), c = new Color();
    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const p = river.getPointAt(t), tan = river.getTangentAt(t);
      n.crossVectors(tan, up).normalize();
      b.crossVectors(n, tan).normalize();
      const g1 = gauss(), g2 = gauss();
      const width = 15 + 6 * Math.sin(t * 19) + 3 * Math.sin(t * 47);
      const dust = Math.random() < 0.82;
      const across = g1 * width * (dust ? 1 : 0.55);
      // The ribbon is tilted about its own axis, so from the route it reads as a diagonal band.
      p.addScaledVector(n, across * 0.62 + g2 * width * 0.2).addScaledVector(b, across * 0.78 - g2 * width * 0.15);
      pos.set([p.x, p.y, p.z], i * 3);
      const centre = Math.exp(-(g1 * g1) * 0.9);
      if (dust) {
        c.copy(navy).lerp(blush, Math.max(0, Math.sin(t * 31 + g2) * 0.5 + 0.2)).lerp(gold, centre * 0.45);
        c.multiplyScalar(0.35 + centre * 0.55);
        size[i] = 5 + Math.random() * 10;
      } else {
        c.copy(white).lerp(gold, Math.random() * 0.6);
        size[i] = 1.2 + Math.pow(Math.random(), 4) * 3;
      }
      tint.set([c.r, c.g, c.b], i * 3);
    }
    return [geometry(pos, size, tint), pointsMaterial({ attenuate: true, softness: 0.0, reach: 140, nearFade: [2, 9] })];
  }, [count]);
  useTime(mat);
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

/** Big, faint, soft sprites along the river: the glow you see in the keyframes. */
function Nebula() {
  const count = small ? 420 : 900;
  const [geo, mat] = useMemo(() => {
    const pos = new Float32Array(count * 3), size = new Float32Array(count), tint = new Float32Array(count * 3);
    const palette = ['#2c4a86', '#3d5f9e', '#8a5d72', '#c79a8c', '#f1ddb0'].map((h) => new Color(h));
    const up = new Vector3(0, 1, 0), n = new Vector3(), c = new Color();
    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const p = river.getPointAt(t), tan = river.getTangentAt(t);
      n.crossVectors(tan, up).normalize();
      const g = gauss();
      p.addScaledVector(n, g * 9 * 0.62).add(new Vector3(0, g * 9 * 0.78 + gauss() * 2.5, 0));
      pos.set([p.x, p.y, p.z], i * 3);
      c.copy(palette[Math.floor(Math.random() * 4)]).lerp(palette[4], Math.exp(-g * g) * 0.35);
      c.multiplyScalar(0.05 + Math.random() * 0.05);
      tint.set([c.r, c.g, c.b], i * 3);
      size[i] = 40 + Math.random() * 90;
    }
    return [geometry(pos, size, tint), pointsMaterial({ attenuate: true, softness: 1, reach: 160, nearFade: [14, 45] })];
  }, [count]);
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ------------------------------------------------------------------ the fourteen stars */

const BRIGHT: Record<string, number> = { altair: 1.5, vega: 1.6, albireo: 1.2, sadr: 1.1 };

function ProjectStars({ unlocked, visited, hiddenUntil }: { unlocked: boolean; visited: string[]; hiddenUntil: Set<string> }) {
  const ref = useRef<Points>(null);
  const [geo, mat] = useMemo(() => {
    const list = [...stars.map((s) => ({ key: s.key, p: s.position })), { key: 'deneb', p: deneb }, { key: 'aljanah', p: aljanah }];
    const pos = new Float32Array(list.length * 3), size = new Float32Array(list.length), tint = new Float32Array(list.length * 3);
    list.forEach((s, i) => pos.set([s.p.x, s.p.y, s.p.z], i * 3));
    const g = geometry(pos, size, tint);
    g.userData.keys = list.map((s) => s.key);
    return [g, pointsMaterial({ attenuate: true, softness: 0, star: true, reach: 120 })];
  }, []);
  useTime(mat);
  // Brightness follows the story: drafts are silver, visited stars warm to blush, Deneb waits.
  useEffect(() => {
    const keys: string[] = geo.userData.keys;
    const size = geo.getAttribute('size') as BufferAttribute, tint = geo.getAttribute('tint') as BufferAttribute;
    keys.forEach((key, i) => {
      const star = stars.find((s) => s.key === key);
      let s = 26 * (BRIGHT[key] ?? 1), c = [1, 0.9, 0.74];
      if (key === 'vega') c = [0.82, 0.9, 1];
      if (star?.status === 'draft') c = [0.62, 0.72, 0.82];
      if (unlocked && visited.includes(key)) c = [1, 0.72, 0.78];
      if (hiddenUntil.has(key)) { s = 9; c = [0.45, 0.5, 0.6]; }
      if (key === 'deneb') { s = flight.bridgeLit ? 40 : 16; c = flight.bridgeLit ? [1, 0.95, 0.85] : [0.55, 0.62, 0.72]; }
      if (key === 'aljanah') { s = 8; c = [0.45, 0.5, 0.58]; }
      size.setX(i, s);
      tint.setXYZ(i, c[0], c[1], c[2]);
    });
    size.needsUpdate = true;
    tint.needsUpdate = true;
  }, [geo, unlocked, visited, hiddenUntil]);
  useFrame(() => {
    // Deneb ignites once the bridge chapter has been reached.
    const size = geo.getAttribute('size') as BufferAttribute;
    const i = (geo.userData.keys as string[]).indexOf('deneb');
    const target = flight.bridgeLit ? 44 : 16;
    size.setX(i, MathUtils.lerp(size.getX(i), target, 0.04));
    size.needsUpdate = true;
  });
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}

function FigureLines({ progress }: { progress: number }) {
  const geo = useMemo(() => {
    const pts: number[] = [];
    figureLines.forEach(([a, b]) => {
      const pa = positionOf(a), pb = positionOf(b);
      if (pa && pb) pts.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
    });
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
    return g;
  }, []);
  return <lineSegments geometry={geo} frustumCulled={false}>
    <lineBasicMaterial color="#d9b472" transparent opacity={0.16 + 0.2 * progress} depthWrite={false} blending={AdditiveBlending} />
  </lineSegments>;
}

/* ------------------------------------------------------------------ a window into each world */

const windowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
/** Rounded portrait window with a thin champagne edge and a soft outer glow. */
const windowFragment = /* glsl */ `
  uniform sampler2D map;
  uniform float opacity;
  uniform float hasMap;
  varying vec2 vUv;
  float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  void main() {
    vec2 p = (vUv - 0.5) * vec2(0.5625, 1.0);
    float d = box(p, vec2(0.5625, 1.0) * 0.46, 0.035);
    vec3 picture = hasMap > 0.5 ? texture2D(map, (p / vec2(0.5625, 1.0)) / 0.92 + 0.5).rgb : vec3(0.02, 0.07, 0.11);
    float inside = smoothstep(0.002, -0.002, d);
    float edge = smoothstep(0.006, 0.0, abs(d)) * 0.9;
    float glow = exp(-max(d, 0.0) * 60.0) * 0.35 * (1.0 - inside);
    vec3 gold = vec3(0.95, 0.82, 0.58);
    vec3 col = picture * inside + gold * (edge + glow);
    float a = max(inside, max(edge, glow)) * opacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(col, a);
  }
`;

type Pane = { mesh: Mesh; material: ShaderMaterial; video: HTMLVideoElement; poster?: Texture; live?: VideoTexture; loading: boolean };

/**
 * Each star carries a small looping film of its world, hung in the sky just above it. Only the
 * star beside the camera loads and plays; the others stay as nothing at all.
 */
function StarWindows() {
  const { camera } = useThree();
  const loader = useMemo(() => new TextureLoader(), []);
  // A unit-high 9:16 plane, scaled every frame to a share of the screen height.
  const geometry = useMemo(() => new PlaneGeometry(0.5625, 1), []);
  const anchor = useMemo(() => new Vector3(), []);
  const streaming = useMemo(() => canStream(), []);
  const panes = useMemo<Pane[]>(() => stars.map(() => {
    const material = new ShaderMaterial({ uniforms: { map: { value: null }, opacity: { value: 0 }, hasMap: { value: 0 } }, vertexShader: windowVertex, fragmentShader: windowFragment, transparent: true, depthWrite: false, depthTest: false });
    const mesh = new Mesh(geometry, material);
    mesh.visible = false;
    mesh.renderOrder = 10; // always in front of lines and dust
    const video = document.createElement('video');
    Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'none' });
    video.setAttribute('playsinline', '');
    return { mesh, material, video, loading: false };
  }), [geometry]);
  useEffect(() => () => panes.forEach((p) => { p.video.pause(); p.video.removeAttribute('src'); p.video.load(); p.live?.dispose(); p.poster?.dispose(); p.material.dispose(); }), [panes]);
  useFrame((state) => {
    panes.forEach((pane, i) => {
      const star = stars[i];
      const d = Math.abs(flight.t - starT[i]);
      const show = 1 - MathUtils.smoothstep(d, 0.012, 0.03);
      pane.mesh.visible = show > 0.01;
      pane.material.uniforms.opacity.value = show;
      if (d < 0.06 && !pane.poster && !pane.loading) {
        pane.loading = true;
        loader.load(`/media/stars/${star.key}.webp`, (texture) => {
          texture.colorSpace = SRGBColorSpace;
          pane.poster = texture;
          if (!pane.live) { pane.material.uniforms.map.value = texture; pane.material.uniforms.hasMap.value = 1; }
        });
      }
      if (d < 0.024 && streaming) {
        if (!pane.video.src) {
          pane.video.src = `/media/stars/${star.key}.mp4`;
          pane.video.addEventListener('playing', () => {
            if (!pane.live) { pane.live = new VideoTexture(pane.video); pane.live.colorSpace = SRGBColorSpace; }
            pane.material.uniforms.map.value = pane.live;
            pane.material.uniforms.hasMap.value = 1;
          }, { once: true });
        }
        if (pane.video.paused) pane.video.play().catch(() => {});
      } else if (!pane.video.paused) pane.video.pause();
      if (!pane.mesh.visible) return;
      // Frame it on screen, not in the world: in the upper third, above its star, at the star's
      // depth, so it never falls off a narrow phone and still drifts with the parallax.
      anchor.copy(star.position).project(camera);
      if (anchor.z > 1) { pane.mesh.visible = false; return; }
      const wide = (camera as unknown as { aspect: number }).aspect > 1;
      const x = wide ? MathUtils.clamp(anchor.x, -0.55, 0.55) * 0.8 : anchor.x * 0.25;
      const y = (wide ? 0.34 : 0.4) + Math.sin(state.clock.elapsedTime * 0.7 + i) * 0.01;
      pane.mesh.position.set(x, y, anchor.z).unproject(camera);
      const distance = camera.position.distanceTo(pane.mesh.position);
      const fov = MathUtils.degToRad((camera as unknown as { fov: number }).fov);
      pane.mesh.scale.setScalar(2 * distance * Math.tan(fov / 2) * (wide ? 0.42 : 0.36));
      pane.mesh.quaternion.copy(camera.quaternion);
    });
  });
  return <>{panes.map((pane, i) => <primitive key={i} object={pane.mesh} />)}</>;
}

/* ------------------------------------------------------------------ props from Blender */

const paperMaterial = new MeshStandardMaterial({ color: '#fff3df', emissive: '#f1ddb0', emissiveIntensity: 0.35, roughness: 0.7, side: 2 });

/** The paper plane flies just ahead of the camera, banking into each turn. */
function PaperPlane() {
  const { nodes } = useGLTF('/models/props.glb') as unknown as { nodes: Record<string, Mesh> };
  const group = useRef<Group>(null);
  const { camera } = useThree();
  const ahead = useMemo(() => new Vector3(), []);
  const tmp = useMemo(() => new Object3D(), []);
  useFrame((state) => {
    if (!group.current) return;
    const t = flight.t;
    const here = route.getPointAt(Math.min(1, t + 0.009));
    route.getPointAt(Math.min(1, t + 0.02), ahead);
    tmp.position.copy(here).add(new Vector3(0.35, -0.75 + Math.sin(state.clock.elapsedTime * 1.3) * 0.08, 0));
    tmp.lookAt(ahead);
    group.current.position.lerp(tmp.position, 0.12);
    group.current.quaternion.slerp(tmp.quaternion, 0.08);
    group.current.visible = t < 0.985 && camera.position.distanceTo(group.current.position) > 0.4;
  });
  const geometry = nodes.PaperPlane?.geometry;
  if (!geometry) return null;
  // The Blender dart points along its local +y; turn it so its nose follows lookAt (−z).
  return <group ref={group}>
    <mesh geometry={geometry} material={paperMaterial} rotation={[-Math.PI / 2, 0, Math.PI]} scale={0.12} />
  </group>;
}

function Envelope({ open }: { open: boolean }) {
  const gltf = useGLTF('/models/props.glb') as unknown as { scene: Group };
  const closed = useMemo(() => {
    const source = gltf.scene.getObjectByName(open ? 'EnvelopeOpen' : 'EnvelopeClosed');
    if (!source) return null;
    const copy = source.clone(true);
    copy.position.set(0, 0, 0);
    copy.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const name = (mesh.material as MeshStandardMaterial)?.name ?? '';
      mesh.material = name.startsWith('Wax')
        ? new MeshStandardMaterial({ color: '#d9a04a', metalness: 0.55, roughness: 0.3, emissive: '#5a3410', emissiveIntensity: 0.4 })
        : new MeshStandardMaterial({ color: name.includes('Inner') ? '#f2d9a8' : '#fbf1e2', roughness: 0.85, emissive: name.includes('Inner') && open ? '#ffcf80' : '#000000', emissiveIntensity: open ? 1.2 : 0, side: 2 });
    });
    return copy;
  }, [gltf, open]);
  const ref = useRef<Group>(null);
  const { camera } = useThree();
  const ahead = useMemo(() => new Vector3(), []);
  const sway = useMemo(() => new Quaternion(), []);
  const grow = useRef(0);
  useFrame((state, dt) => {
    const group = ref.current;
    if (!group) return;
    // Framed to the viewer, like the star windows: centred in the upper half of the screen,
    // a fixed distance ahead, and only while the seal chapter is on screen.
    grow.current = MathUtils.damp(grow.current, flight.sealVisible ? 1 : 0, 4, Math.min(dt, 0.1));
    group.visible = grow.current > 0.01;
    if (!group.visible) return;
    const wide = (camera as unknown as { aspect: number }).aspect > 1;
    camera.getWorldDirection(ahead);
    group.position.copy(camera.position).addScaledVector(ahead, 6);
    group.position.add(new Vector3(0, wide ? 0.85 : 1.2, 0).applyQuaternion(camera.quaternion));
    group.position.y += Math.sin(state.clock.elapsedTime * 0.8) * 0.06;
    sway.setFromAxisAngle(new Vector3(0, 1, 0), Math.sin(state.clock.elapsedTime * 0.4) * 0.14);
    group.quaternion.copy(camera.quaternion).multiply(sway);
    group.scale.setScalar((wide ? 0.72 : 0.55) * (0.8 + 0.2 * grow.current));
  });
  if (!closed) return null;
  return <group ref={ref} visible={false}>
    <primitive object={closed} />
    <pointLight position={[0, 0.5, 3]} intensity={open ? 60 : 18} distance={14} color="#ffd9a0" />
  </group>;
}

/* ------------------------------------------------------------------ camera */

function CameraRig() {
  const { camera } = useThree();
  const look = useMemo(() => new Vector3(), []);
  const lookTarget = useMemo(() => new Vector3(), []);
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const move = (e: PointerEvent) => { pointer.current = { x: e.clientX / innerWidth - 0.5, y: e.clientY / innerHeight - 0.5 }; };
    addEventListener('pointermove', move, { passive: true });
    return () => removeEventListener('pointermove', move);
  }, []);
  useFrame((_, dt) => {
    // Ease toward the scroll position so a flick of the thumb still feels like gliding.
    flight.t = MathUtils.damp(flight.t, flight.target, 2.6, Math.min(dt, 0.1));
    const t = flight.t;
    route.getPointAt(t, camera.position);
    camera.position.x += pointer.current.x * 0.8;
    camera.position.y -= pointer.current.y * 0.5;
    route.getPointAt(Math.min(1, t + 0.02), lookTarget);
    if (flight.focus) lookTarget.lerp(flight.focus, 0.35);
    if (t > 0.97) lookTarget.copy(sealPoint).add(new Vector3(0, 0.6, 0));
    look.lerp(lookTarget, 1 - Math.exp(-dt * 4));
    camera.lookAt(look);
  });
  return null;
}

/* ------------------------------------------------------------------ canvas */

export default function Scene({ unlocked, visited, hiddenUntil, opened }: { unlocked: boolean; visited: string[]; hiddenUntil: Set<string>; opened: boolean }) {
  return <Canvas
    className="immersive-canvas"
    dpr={[1, 1.75]}
    gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
    camera={{ fov: 58, near: 0.1, far: 3000, position: [0, 0, 34] }}
    onCreated={({ gl, scene }) => { gl.setClearColor(NIGHT); scene.background = NIGHT; }}
    frameloop="always"
  >
    <ambientLight intensity={0.35} color="#9fb4c7" />
    <directionalLight position={[3, 6, 8]} intensity={1.4} color="#ffe4bd" />
    <Starfield />
    <Nebula />
    <River />
    <FigureLines progress={unlocked ? 1 : 0} />
    <ProjectStars unlocked={unlocked} visited={visited} hiddenUntil={hiddenUntil} />
    <StarWindows />
    <PaperPlane />
    {/* Once opened, the seal film tells that moment; the 3D envelope steps aside. */}
    {!opened && <Envelope open={false} />}
    <CameraRig />
  </Canvas>;
}

useGLTF.preload('/models/props.glb');
