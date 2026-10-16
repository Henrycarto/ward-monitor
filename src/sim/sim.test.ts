import { describe, expect, it } from 'vitest';
import { score } from '../clinical/news2';
import { whatChanged } from './explain';
import { PATIENTS, SIM_END, SIM_START, clockLabel, vitalsAt } from './patients';

const bed = (n: number) => PATIENTS.find((p) => p.bed === n)!;
const newsAt = (n: number, t: number) => score(vitalsAt(bed(n), t), bed(n).spo2Scale);

describe('simulated ward', () => {
  it('is deterministic', () => {
    expect(vitalsAt(bed(3), 333)).toEqual(vitalsAt(bed(3), 333));
  });

  it('bed 3 deteriorates from low to high risk during the demo window', () => {
    expect(newsAt(3, 0).risk).toBe('low');
    expect(newsAt(3, SIM_START).total).toBeLessThan(5);
    expect(newsAt(3, 420).risk).toBe('high');
  });

  it('bed 11 triggers on a single red parameter while the total stays low', () => {
    const s = newsAt(11, 330);
    expect(s.points.pulse).toBe(3);
    expect(s.total).toBeLessThan(5);
    expect(s.risk).toBe('low-medium');
  });

  it('bed 9 sits on SpO2 scale 2 and only scores for oxygen at target', () => {
    expect(newsAt(9, SIM_START).points.spo2).toBe(0);
  });

  it('bed 1 is improving', () => {
    expect(newsAt(1, SIM_END).total).toBeLessThan(newsAt(1, 0).total);
  });

  it('explains change in plain words', () => {
    expect(whatChanged(bed(3), 390)).toMatch(/SpO₂ down|breathing rate up|pulse up|started on oxygen|systolic BP down/i);
    expect(whatChanged(bed(8), 400)).toBe('Stable, all observations in range.');
  });

  it('formats the shift clock across midnight', () => {
    expect(clockLabel(0)).toBe('18:00');
    expect(clockLabel(360)).toBe('00:00');
    expect(clockLabel(SIM_START)).toBe('23:00');
  });
});
