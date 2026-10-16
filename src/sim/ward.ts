/** Derived ward state: scores, history, and review status for every bed at a given minute. */
import { score, type Observation, type Risk, type Score } from '../clinical/news2';
import { whatChanged } from './explain';
import { HISTORY, PATIENTS, type PatientDef, vitalsAt } from './patients';

export const RISK_RANK: Record<Risk, number> = { low: 0, 'low-medium': 1, medium: 2, high: 3 };
export const RISK_LABEL: Record<Risk, string> = { low: 'Low', 'low-medium': 'Low-medium', medium: 'Medium', high: 'High' };

export interface Ack {
  at: number;
  rank: number;
  kind: 'acknowledged' | 'escalated';
}

export type Status =
  | { kind: 'routine' }
  | { kind: 'review'; since: number }
  | { kind: 'acknowledged' | 'escalated'; at: number; due: number; overdue: boolean };

export interface BedState {
  p: PatientDef;
  obs: Observation;
  s: Score;
  history: number[]; // NEWS2 total every 10 minutes over the last 6 hours, oldest first
  changed: string;
  status: Status;
}

export const STEP = 10;

/** When the current risk level was first reached, scanning back in 5-minute steps. */
function riskSince(p: PatientDef, now: number, rank: number): number {
  let t = now;
  while (t - 5 >= 0 && RISK_RANK[score(vitalsAt(p, t - 5), p.spo2Scale).risk] >= rank) t -= 5;
  return t;
}

export function bedState(p: PatientDef, now: number, ack?: Ack): BedState {
  const obs = vitalsAt(p, now);
  const s = score(obs, p.spo2Scale);
  const history: number[] = [];
  for (let t = now - HISTORY; t <= now; t += STEP) history.push(t < 0 ? NaN : score(vitalsAt(p, t), p.spo2Scale).total);
  const rank = RISK_RANK[s.risk];
  let status: Status = { kind: 'routine' };
  if (rank >= 1) {
    if (ack && ack.rank >= rank) {
      const due = ack.at + (rank >= 3 ? 30 : 60);
      status = { kind: ack.kind, at: ack.at, due, overdue: now > due };
    } else {
      status = { kind: 'review', since: riskSince(p, now, rank) };
    }
  }
  return { p, obs, s, history, changed: whatChanged(p, now), status };
}

export function wardState(now: number, acks: Record<number, Ack>): BedState[] {
  const beds = PATIENTS.map((p) => bedState(p, now, acks[p.bed]));
  const urgency = (b: BedState) =>
    (b.status.kind === 'review' || (b.status.kind !== 'routine' && b.status.overdue) ? 100 : 0) + RISK_RANK[b.s.risk] * 20 + b.s.total;
  return beds.sort((a, b) => urgency(b) - urgency(a) || a.p.bed - b.p.bed);
}
