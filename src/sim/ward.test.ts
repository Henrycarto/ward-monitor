import { describe, expect, it } from 'vitest';
import { PATIENTS } from './patients';
import { bedState, wardState } from './ward';

const bed3 = PATIENTS.find((p) => p.bed === 3)!;

describe('review workflow', () => {
  it('a patient who reaches medium or high risk needs review, most urgent first', () => {
    const ward = wardState(420, {});
    expect(ward[0].p.bed).toBe(3);
    expect(ward[0].status.kind).toBe('review');
  });

  it('acknowledging sets a reassessment time: 30 minutes at high risk', () => {
    const st = bedState(bed3, 420, { at: 420, rank: 3, kind: 'acknowledged' }).status;
    expect(st).toMatchObject({ kind: 'acknowledged', due: 450, overdue: false });
    expect(bedState(bed3, 455, { at: 420, rank: 3, kind: 'acknowledged' }).status).toMatchObject({ overdue: true });
  });

  it('an overdue reassessment goes back to the top of the list', () => {
    const ward = wardState(455, { 3: { at: 420, rank: 3, kind: 'acknowledged' } });
    expect(ward[0].p.bed).toBe(3);
  });

  it('an acknowledgement at a lower risk does not cover a higher one', () => {
    expect(bedState(bed3, 420, { at: 330, rank: 1, kind: 'acknowledged' }).status.kind).toBe('review');
  });

  it('stable patients need no action', () => {
    const p = PATIENTS.find((x) => x.bed === 8)!;
    expect(bedState(p, 400).status.kind).toBe('routine');
  });

  it('history covers six hours in 10-minute steps', () => {
    expect(bedState(bed3, 420).history).toHaveLength(37);
  });
});
