import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PARAM_LABEL, type Param } from './clinical/news2';
import { EMPTY_BEDS, SHIFT_START, SIM_END, SIM_START, clockLabel, vitalsAt } from './sim/patients';
import { type Ack, type BedState, RISK_LABEL, RISK_RANK, wardState } from './sim/ward';
import { Spark, Strip } from './ui/Strip';
import { Waveform } from './ui/Waveform';

const SIM_MINUTES_PER_SECOND = 1; // one simulated minute per real second

/** ?at=01:00 opens the demo at that point in the shift (18:00 to 04:00). */
function startMinute(): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(new URLSearchParams(window.location.search).get('at') ?? '');
  if (!m) return SIM_START;
  const mins = ((Number(m[1]) * 60 + Number(m[2]) - SHIFT_START + 1440) % 1440);
  return Math.min(SIM_END, Math.max(0, mins));
}

function statusText(b: BedState): { cls: string; text: string } | null {
  const st = b.status;
  if (st.kind === 'routine') return null;
  if (st.kind === 'review') return { cls: 'review', text: `Needs review since ${clockLabel(st.since)}` };
  const verb = st.kind === 'escalated' ? 'Escalated to outreach' : 'Acknowledged';
  if (st.overdue) return { cls: 'overdue', text: `${verb} at ${clockLabel(st.at)}. Reassessment overdue since ${clockLabel(st.due)}` };
  return { cls: 'ack', text: `${verb} at ${clockLabel(st.at)}. Reassess by ${clockLabel(st.due)}` };
}

/** Rows slide to their new place when the order changes, so a patient moving up is seen moving up. */
function useFlip(keys: string) {
  const refs = useRef(new Map<number, HTMLElement>());
  const prev = useRef(new Map<number, number>());
  useLayoutEffect(() => {
    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !document.hidden;
    refs.current.forEach((el, bed) => {
      // End any slide still in flight before measuring, so the position is the real layout
      // position and not one offset by a transform. A hidden tab stalls animations, and
      // measuring through them would compound the offset on every reorder.
      el.getAnimations().forEach((a) => a.cancel());
      const top = el.getBoundingClientRect().top;
      const before = prev.current.get(bed);
      if (animate && before !== undefined && Math.abs(before - top) > 2) {
        el.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'translateY(0)' }], {
          duration: 420,
          easing: 'cubic-bezier(.2,.7,.2,1)',
        });
      }
      prev.current.set(bed, top);
    });
  }, [keys]);
  return (bed: number) => (el: HTMLElement | null) => {
    if (el) refs.current.set(bed, el);
    else refs.current.delete(bed);
  };
}

export default function App() {
  const [now, setNow] = useState(startMinute);
  const [running, setRunning] = useState(true);
  const [acks, setAcks] = useState<Record<number, Ack>>({});
  const [selected, setSelected] = useState<number>(3);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
  }, [theme]);
  const dimmed = theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow((t) => Math.min(SIM_END, t + SIM_MINUTES_PER_SECOND)), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (now >= SIM_END) setRunning(false);
  }, [now]);

  useEffect(() => {
    if (open) window.scrollTo({ top: 0 });
  }, [open, selected]);

  const minute = Math.floor(now);
  const beds = useMemo(() => wardState(minute, acks), [minute, acks]);
  const order = beds.map((b) => b.p.bed).join(',');
  const flipRef = useFlip(order);
  const current = beds.find((b) => b.p.bed === selected) ?? beds[0];
  const review = beds.filter((b) => b.status.kind === 'review').length;
  const overdue = beds.filter((b) => b.status.kind !== 'routine' && b.status.kind !== 'review' && b.status.overdue).length;

  const act = useCallback(
    (kind: Ack['kind']) => setAcks((a) => ({ ...a, [current.p.bed]: { at: minute, rank: RISK_RANK[current.s.risk], kind } })),
    [current, minute],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
      const i = beds.findIndex((b) => b.p.bed === selected);
      if (e.key === 'ArrowDown' || e.key === 'j') setSelected(beds[Math.min(beds.length - 1, i + 1)].p.bed);
      else if (e.key === 'ArrowUp' || e.key === 'k') setSelected(beds[Math.max(0, i - 1)].p.bed);
      else if (e.key === 'a' && current.status.kind !== 'routine') act('acknowledged');
      else if (e.key === ' ' && e.target === document.body) setRunning((r) => !r);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [beds, selected, current, act]);

  const params: Array<[Param, string, string, (t: number) => number, [number, number]]> = [
    ['respRate', String(current.obs.respRate), '/min', (t) => vitalsAt(current.p, t).respRate, [4, 40]],
    ['spo2', String(current.obs.spo2), '%', (t) => vitalsAt(current.p, t).spo2, [80, 100]],
    ['air', current.obs.onOxygen ? 'Oxygen' : 'Air', '', (t) => (vitalsAt(current.p, t).onOxygen ? 1 : 0), [-0.2, 1.2]],
    ['systolic', String(current.obs.systolic), 'mmHg', (t) => vitalsAt(current.p, t).systolic, [60, 200]],
    ['pulse', String(current.obs.pulse), '/min', (t) => vitalsAt(current.p, t).pulse, [30, 170]],
    ['consciousness', current.obs.consciousness === 'alert' ? 'Alert' : 'New confusion', '', (t) => (vitalsAt(current.p, t).consciousness === 'alert' ? 0 : 1), [-0.2, 1.2]],
    ['temp', current.obs.temp.toFixed(1), '°C', (t) => vitalsAt(current.p, t).temp, [34, 41]],
  ];
  const trend = (f: (t: number) => number) => Array.from({ length: 37 }, (_, i) => f(Math.max(0, minute - 360 + i * 10)));
  const st = statusText(current);

  return (
    <div className="shell">
      <header className="top">
        <div className="ward">
          <h1>Ward 4B</h1>
          <span>Acute medicine, night shift</span>
        </div>
        <div className="clock" aria-live="off">{clockLabel(minute)}</div>
        <div className="summary" aria-live="polite">
          {review > 0 ? <strong>{review} {review === 1 ? 'patient needs' : 'patients need'} review</strong> : 'No patient waiting for review'}
          {overdue > 0 && `, ${overdue} reassessment${overdue === 1 ? '' : 's'} overdue`}
        </div>
        <div className="spacer" />
        <div className="controls">
          <span className="simnote">Simulated, 1 minute per second</span>
          <button className="btn" onClick={() => setRunning((r) => !r)} aria-pressed={!running}>
            {running ? 'Pause' : now >= SIM_END ? 'Shift ended' : 'Resume'}
          </button>
          <button className="btn" onClick={() => setTheme(dimmed ? 'light' : 'dark')} aria-pressed={dimmed}>
            {dimmed ? 'Bright display' : 'Dim display'}
          </button>
          <button className="btn" onClick={() => { setNow(SIM_START); setAcks({}); setRunning(true); }}>Restart</button>
        </div>
      </header>

      <main className={`main${open ? ' open' : ''}`}>
        <section className="list" aria-label="Patients, most urgent first">
          {beds.map((b) => {
            const s = statusText(b);
            return (
              <button
                key={b.p.bed}
                ref={flipRef(b.p.bed)}
                className={`row${b.status.kind === 'review' ? ' attention' : ''}`}
                aria-current={b.p.bed === current.p.bed}
                onClick={() => { setSelected(b.p.bed); setOpen(true); }}
              >
                <span className="bed">{b.p.bed}</span>
                <span className="who">
                  {b.p.name}
                  <small>{b.p.age} {b.p.sex}, {b.p.reason}</small>
                </span>
                <Strip values={b.history} label={`NEWS2 over the last 6 hours, now ${b.s.total}`} />
                <span className={`score ${b.s.risk}`} aria-label={`NEWS2 ${b.s.total}, ${RISK_LABEL[b.s.risk]} risk`}>{b.s.total}</span>
                <span className="changed">{b.changed}</span>
                {s && <span className={`status ${s.cls}`}>{s.text}</span>}
              </button>
            );
          })}
          {EMPTY_BEDS.map((bed) => (
            <div className="empty" key={bed}>
              <span className="bed">{bed}</span>
              <span>Empty. An admission from the emergency department is expected.</span>
            </div>
          ))}
        </section>

        <section className="detail" aria-label={`Bed ${current.p.bed} details`}>
          <button className="btn back" onClick={() => setOpen(false)}>All patients</button>
          <div className="dhead">
            <div>
              <h2>Bed {current.p.bed}, {current.p.name}</h2>
              <p>{current.p.age} {current.p.sex === 'F' ? 'female' : 'male'}. {current.p.reason}. {current.p.admitted}.</p>
            </div>
            <div className="bigscore">
              <div className={`num ${current.s.risk}`}>{current.s.total}</div>
              <div className="lbl">NEWS2, {RISK_LABEL[current.s.risk].toLowerCase()} risk</div>
            </div>
          </div>

          <div className={`response ${current.s.risk}`}>
            <b>{current.s.frequency}</b>
            {current.s.response}
          </div>

          {current.status.kind !== 'routine' && (
            <div className="actions">
              <button className="btn primary" onClick={() => act('acknowledged')}>Acknowledge</button>
              <button className="btn danger" onClick={() => act('escalated')}>Escalate to outreach</button>
              {st && <span className="note">{st.text}</span>}
            </div>
          )}

          <div className="wave">
            <div className="cap">
              <span>Pulse waveform, finger sensor</span>
              <span>{current.obs.pulse} beats per minute</span>
            </div>
            <Waveform bpm={current.obs.pulse} running={running} theme={dimmed ? 'dark' : 'light'} />
          </div>

          <table className="obs">
            <thead>
              <tr><th>Observation</th><th>Now</th><th>Points</th><th>Last 6 hours</th></tr>
            </thead>
            <tbody>
              {params.map(([k, v, unit, f, range]) => (
                <tr key={k}>
                  <td>{PARAM_LABEL[k]}</td>
                  <td className="val">{v}<small>{unit}</small></td>
                  <td><span className={`pts p${current.s.points[k]}`}>{current.s.points[k]}</span></td>
                  <td><Spark values={trend(f)} range={range} label={`${PARAM_LABEL[k]} over the last 6 hours`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {current.p.spo2Scale === 2 && <p className="scale">SpO₂ scored on scale 2. {current.p.scaleNote}.</p>}

          <p className="foot">
            Fictional patients and simulated data, for demonstration only. Not a medical device. Scores follow the NEWS2 chart
            (Royal College of Physicians, 2017). Keyboard: arrow keys move between patients, A acknowledges, space pauses.
          </p>
        </section>
      </main>
    </div>
  );
}

