import type { Vector3 } from 'three';

/**
 * Shared, mutable flight state. The DOM writes it from scroll; the 3D scene reads it every
 * frame. A plain object on purpose: no React re-render per scroll event.
 */
export const flight = {
  /** Where the scroll says the camera should be on the route, 0 to 1. */
  target: 0,
  /** Where the camera actually is (eased toward target each frame). */
  t: 0,
  /** A star the camera should glance toward, if one is close. */
  focus: null as Vector3 | null,
  /** Deneb lights once the bridge chapter has been reached. */
  bridgeLit: false,
  /** True while the seal chapter is on screen: the envelope only appears then. */
  sealVisible: false,
};

// Visual QA and tests jump the camera with window.__flight.t = window.__flight.target = x.
if (typeof window !== 'undefined') (window as unknown as { __flight: typeof flight }).__flight = flight;
