/**
 * Simulated ward. Each patient follows keyframed vital signs over the shift (minutes from 18:00),
 * with small seeded noise so the traces look like monitoring, not like a spreadsheet.
 * Every patient is fictional. The trajectories follow common ward courses so the scores behave
 * the way they would on a real ward.
 */
import type { Consciousness, Observation } from '../clinical/news2';

type Key = Partial<Observation> & { t: number };

export interface PatientDef {
  bed: number;
  name: string; // fictional
  age: number;
  sex: 'F' | 'M';
  reason: string;
  admitted: string;
  spo2Scale: 1 | 2;
  scaleNote?: string;
  keys: Key[];
}

export const SHIFT_START = 18 * 60; // 18:00
export const HISTORY = 6 * 60; // minutes of history shown
export const SIM_START = 300; // the demo opens at 23:00 with 5 hours of history
export const SIM_END = 600; // 04:00

const base: Observation = { respRate: 16, spo2: 97, onOxygen: false, systolic: 124, pulse: 76, consciousness: 'alert', temp: 36.8 };

export const PATIENTS: PatientDef[] = [
  {
    bed: 3, name: 'Margarete Huber', age: 71, sex: 'F', reason: 'Community-acquired pneumonia', admitted: 'Admitted yesterday',
    spo2Scale: 1,
    keys: [
      { t: 0, respRate: 18, spo2: 95, systolic: 128, pulse: 88, temp: 37.8 },
      { t: 300, respRate: 19, spo2: 95, systolic: 122, pulse: 90, temp: 37.9 },
      { t: 330, respRate: 23, spo2: 93, systolic: 112, pulse: 104, temp: 38.6 },
      { t: 360, respRate: 25, spo2: 91, systolic: 104, pulse: 112, temp: 39.0, onOxygen: false },
      { t: 380, respRate: 26, spo2: 92, systolic: 99, pulse: 118, temp: 39.2, onOxygen: true },
      { t: 420, respRate: 28, spo2: 91, systolic: 94, pulse: 124, temp: 39.4, onOxygen: true, consciousness: 'new-confusion' },
      { t: 600, respRate: 29, spo2: 90, systolic: 92, pulse: 126, temp: 39.4, onOxygen: true, consciousness: 'new-confusion' },
    ],
  },
  {
    bed: 11, name: 'Josef Wagner', age: 67, sex: 'M', reason: 'Atrial fibrillation with fast ventricular rate', admitted: 'Admitted today',
    spo2Scale: 1,
    keys: [
      { t: 0, respRate: 17, spo2: 96, systolic: 118, pulse: 112, temp: 36.9 },
      { t: 280, respRate: 18, spo2: 96, systolic: 116, pulse: 124 },
      { t: 320, respRate: 19, spo2: 95, systolic: 112, pulse: 138 },
      { t: 450, respRate: 18, spo2: 96, systolic: 116, pulse: 104 },
      { t: 600, respRate: 17, spo2: 96, systolic: 120, pulse: 92 },
    ],
  },
  {
    bed: 2, name: 'Elfriede Bauer', age: 76, sex: 'F', reason: 'Upper GI bleed, on watch', admitted: 'Admitted today',
    spo2Scale: 1,
    keys: [
      { t: 0, respRate: 16, spo2: 97, systolic: 132, pulse: 84, temp: 36.6 },
      { t: 300, respRate: 17, spo2: 97, systolic: 118, pulse: 92 },
      { t: 450, respRate: 20, spo2: 96, systolic: 104, pulse: 106 },
      { t: 540, respRate: 22, spo2: 96, systolic: 96, pulse: 114 },
      { t: 600, respRate: 23, spo2: 95, systolic: 92, pulse: 118 },
    ],
  },
  {
    bed: 9, name: 'Franz Gruber', age: 82, sex: 'M', reason: 'COPD exacerbation', admitted: 'Day 3',
    spo2Scale: 2, scaleNote: 'Target 88 to 92%, hypercapnic respiratory failure confirmed on blood gas',
    keys: [
      { t: 0, respRate: 20, spo2: 90, systolic: 136, pulse: 86, temp: 36.9, onOxygen: true },
      { t: 600, respRate: 19, spo2: 90, systolic: 134, pulse: 84, temp: 36.8, onOxygen: true },
    ],
  },
  {
    bed: 1, name: 'Sabine Novak', age: 45, sex: 'F', reason: 'Diabetic ketoacidosis, resolving', admitted: 'Day 2',
    spo2Scale: 1,
    keys: [
      { t: 0, respRate: 24, spo2: 97, systolic: 108, pulse: 112, temp: 37.1 },
      { t: 240, respRate: 20, spo2: 98, systolic: 114, pulse: 98 },
      { t: 420, respRate: 17, spo2: 98, systolic: 120, pulse: 88 },
      { t: 600, respRate: 16, spo2: 98, systolic: 122, pulse: 82 },
    ],
  },
  { bed: 7, name: 'Thomas Leitner', age: 58, sex: 'M', reason: 'Day 1 after hip replacement', admitted: 'Day 1', spo2Scale: 1,
    keys: [{ t: 0, respRate: 16, spo2: 96, systolic: 128, pulse: 86, temp: 37.4 }, { t: 600, respRate: 15, spo2: 97, systolic: 124, pulse: 80, temp: 37.1 }] },
  { bed: 5, name: 'Lena Hofer', age: 34, sex: 'F', reason: 'Cellulitis, left leg', admitted: 'Day 2', spo2Scale: 1,
    keys: [{ t: 0, temp: 37.6, pulse: 84 }, { t: 600, temp: 37.0, pulse: 74 }] },
  { bed: 4, name: 'Walter Pichler', age: 79, sex: 'M', reason: 'Fall at home, under observation', admitted: 'Day 1', spo2Scale: 1,
    keys: [{ t: 0, systolic: 146, pulse: 68, respRate: 15 }, { t: 600, systolic: 142, pulse: 66, respRate: 15 }] },
  { bed: 6, name: 'Ingrid Mayr', age: 63, sex: 'F', reason: 'Heart failure, diuresing', admitted: 'Day 4', spo2Scale: 1,
    keys: [{ t: 0, respRate: 20, spo2: 95, systolic: 112, pulse: 82 }, { t: 600, respRate: 18, spo2: 96, systolic: 114, pulse: 78 }] },
  { bed: 8, name: 'Peter Steiner', age: 52, sex: 'M', reason: 'Chest pain, troponin negative', admitted: 'Today', spo2Scale: 1,
    keys: [{ t: 0, pulse: 72, systolic: 134 }, { t: 600, pulse: 70, systolic: 130 }] },
  { bed: 10, name: 'Anna Berger', age: 88, sex: 'F', reason: 'Urinary tract infection', admitted: 'Day 3', spo2Scale: 1,
    keys: [{ t: 0, temp: 37.9, pulse: 88, respRate: 18 }, { t: 600, temp: 37.2, pulse: 80, respRate: 17 }] },
];

export const EMPTY_BEDS = [12];

/** Deterministic noise in [-1, 1] per patient, parameter and minute. */
function noise(seed: number, minute: number): number {
  const x = Math.sin(seed * 127.1 + minute * 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

const NOISE: Record<'respRate' | 'spo2' | 'systolic' | 'pulse' | 'temp', number> = { respRate: 0.8, spo2: 0.6, systolic: 3, pulse: 2.5, temp: 0.05 };

export function vitalsAt(p: PatientDef, minute: number): Observation {
  const keys = p.keys;
  const full = (k: Key): Observation => ({ ...base, ...keys.filter((x) => x.t <= k.t).reduce((a, b) => ({ ...a, ...b }), {}), ...k });
  let lo = keys[0];
  let hi = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (minute >= keys[i].t && minute <= keys[i + 1].t) {
      lo = keys[i];
      hi = keys[i + 1];
      break;
    }
  }
  const a = full(lo);
  const b = full(hi);
  const f = hi.t === lo.t ? 0 : Math.min(1, Math.max(0, (minute - lo.t) / (hi.t - lo.t)));
  const lerp = (x: number, y: number) => x + (y - x) * f;
  const n = (k: keyof typeof NOISE, i: number) => noise(p.bed * 10 + i, minute) * NOISE[k];
  const consciousness: Consciousness = minute >= hi.t ? b.consciousness : a.consciousness;
  return {
    respRate: Math.round(lerp(a.respRate, b.respRate) + n('respRate', 1)),
    spo2: Math.min(100, Math.round(lerp(a.spo2, b.spo2) + n('spo2', 2))),
    onOxygen: minute >= hi.t ? b.onOxygen : a.onOxygen,
    systolic: Math.round(lerp(a.systolic, b.systolic) + n('systolic', 3)),
    pulse: Math.round(lerp(a.pulse, b.pulse) + n('pulse', 4)),
    consciousness,
    temp: Math.round((lerp(a.temp, b.temp) + n('temp', 5)) * 10) / 10,
  };
}

export function clockLabel(minute: number): string {
  const m = (SHIFT_START + Math.floor(minute)) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
