/** Plain-language summary of what changed in the last hour, for the ward list. */
import { score, type Observation } from '../clinical/news2';
import { type PatientDef, vitalsAt } from './patients';

interface Change {
  weight: number;
  text: string;
}

export function whatChanged(p: PatientDef, now: number, window = 60): string {
  const was = vitalsAt(p, Math.max(0, now - window));
  const is = vitalsAt(p, now);
  const s0 = score(was, p.spo2Scale);
  const s1 = score(is, p.spo2Scale);
  const changes: Change[] = [];
  const rel = (k: keyof Observation, label: string, unit: string, up: string, down: string, min: number) => {
    const a = was[k] as number;
    const b = is[k] as number;
    if (Math.abs(b - a) < min) return;
    const pk = k === 'spo2' ? 'spo2' : (k as 'respRate' | 'systolic' | 'pulse' | 'temp');
    const dp = s1.points[pk] - s0.points[pk];
    changes.push({ weight: Math.abs(dp) * 10 + Math.abs(b - a) / min, text: `${label} ${b > a ? up : down} from ${a}${unit} to ${b}${unit}` });
  };
  rel('spo2', 'SpO₂', '%', 'up', 'down', 2);
  rel('respRate', 'breathing rate', '', 'up', 'down', 3);
  rel('pulse', 'pulse', '', 'up', 'down', 8);
  rel('systolic', 'systolic BP', '', 'up', 'down', 10);
  rel('temp', 'temperature', '°', 'up', 'down', 0.5);
  if (is.onOxygen && !was.onOxygen) changes.push({ weight: 25, text: 'started on oxygen' });
  if (is.consciousness !== 'alert' && was.consciousness === 'alert') changes.push({ weight: 40, text: 'newly confused' });

  if (!changes.length) return s1.total === 0 ? 'Stable, all observations in range.' : 'No change in the last hour.';
  const top = changes.sort((a, b) => b.weight - a.weight).slice(0, 2).map((c) => c.text);
  const sentence = top.join(', and ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ' in the last hour.';
}
