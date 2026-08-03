/**
 * Standard drag functions. A ballistic coefficient is only meaningful next to
 * the reference shape it was measured against: G1 is the old flat-based
 * "standard bullet", G7 the boat-tailed long-range shape that modern match
 * bullets actually resemble. Quoting a G1 BC for a VLD bullet is why so many
 * published drop charts are wrong past 600 m.
 *
 * Both tables are drag coefficient against Mach number for the reference
 * projectile, which is defined as one pound, one inch across — that is what
 * makes a BC in lb/in^2 divide straight into the drag.
 */

export type DragModel = 'G1' | 'G7';

type Curve = ReadonlyArray<readonly [mach: number, cd: number]>;

const G1: Curve = [
  [0.0, 0.2629], [0.05, 0.2558], [0.1, 0.2487], [0.15, 0.2413], [0.2, 0.2344],
  [0.25, 0.2278], [0.3, 0.2214], [0.35, 0.2155], [0.4, 0.2104], [0.45, 0.2061],
  [0.5, 0.2032], [0.55, 0.202], [0.6, 0.2034], [0.65, 0.2085], [0.7, 0.2165],
  [0.725, 0.223], [0.75, 0.2313], [0.775, 0.2417], [0.8, 0.2546], [0.825, 0.2706],
  [0.85, 0.2901], [0.875, 0.3136], [0.9, 0.3415], [0.925, 0.3734], [0.95, 0.4084],
  [0.975, 0.4448], [1.0, 0.4805], [1.025, 0.5136], [1.05, 0.5427], [1.075, 0.5677],
  [1.1, 0.5883], [1.125, 0.6053], [1.15, 0.6191], [1.2, 0.6393], [1.25, 0.6518],
  [1.3, 0.6589], [1.35, 0.6621], [1.4, 0.6625], [1.5, 0.6573], [1.6, 0.6461],
  [1.8, 0.6147], [2.0, 0.5819], [2.2, 0.5522], [2.5, 0.5142], [3.0, 0.4682],
  [3.5, 0.4389], [4.0, 0.4196], [5.0, 0.3972],
];

const G7: Curve = [
  [0.0, 0.1198], [0.05, 0.1197], [0.1, 0.1196], [0.15, 0.1194], [0.2, 0.1193],
  [0.25, 0.1194], [0.3, 0.1194], [0.35, 0.1194], [0.4, 0.1193], [0.45, 0.1193],
  [0.5, 0.1194], [0.55, 0.1193], [0.6, 0.1194], [0.65, 0.1197], [0.7, 0.1202],
  [0.725, 0.1207], [0.75, 0.1215], [0.775, 0.1226], [0.8, 0.1242], [0.825, 0.1266],
  [0.85, 0.1306], [0.875, 0.1368], [0.9, 0.1464], [0.925, 0.166], [0.95, 0.2054],
  [0.975, 0.2993], [1.0, 0.3803], [1.025, 0.4015], [1.05, 0.4043], [1.075, 0.4034],
  [1.1, 0.4014], [1.125, 0.3987], [1.15, 0.3955], [1.2, 0.3884], [1.25, 0.381],
  [1.3, 0.3732], [1.35, 0.3657], [1.4, 0.358], [1.5, 0.344], [1.6, 0.3315],
  [1.8, 0.3097], [2.0, 0.2914], [2.2, 0.2752], [2.5, 0.2549], [3.0, 0.2275],
  [3.5, 0.2089], [4.0, 0.1961], [5.0, 0.1789],
];

const MACH_MAX = 5;
const SAMPLES = 1024;
const STEP = MACH_MAX / (SAMPLES - 1);

/**
 * Resample a curve onto an even Mach grid so the flight integrator can look a
 * drag coefficient up with an index and a lerp instead of a binary search. The
 * inner loop runs a couple of million times per firing solution.
 */
function resample(curve: Curve): Float64Array {
  const out = new Float64Array(SAMPLES);
  let seg = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const mach = i * STEP;
    while (seg < curve.length - 2 && curve[seg + 1][0] < mach) seg++;
    const [m0, c0] = curve[seg];
    const [m1, c1] = curve[seg + 1];
    const t = m1 === m0 ? 0 : (mach - m0) / (m1 - m0);
    out[i] = c0 + (c1 - c0) * t;
  }
  return out;
}

const TABLES: Record<DragModel, Float64Array> = {
  G1: resample(G1),
  G7: resample(G7),
};

/** Drag coefficient of the reference projectile at this Mach number. */
export function dragCoefficient(model: DragModel, mach: number): number {
  const table = TABLES[model];
  if (mach <= 0) return table[0];
  if (mach >= MACH_MAX) return table[SAMPLES - 1];
  const f = mach / STEP;
  const i = f | 0;
  const t = f - i;
  return table[i] + (table[i + 1] - table[i]) * t;
}

/**
 * Where the drag curve bites. Below about Mach 1.2 a bullet is crossing back
 * through its own transonic hump, and that is where groups open up for reasons
 * no point-mass model can predict — worth flagging to the shooter.
 */
export const TRANSONIC_MACH = 1.2;
export const SUBSONIC_MACH = 1.0;
