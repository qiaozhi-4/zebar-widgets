import { dayLabel, timeParts } from '../lib/format';
import { useZebar } from '../lib/useZebar';
import './clock.css';

const providers = {
  date: { type: 'date', refreshInterval: 1000 },
} as const;

export function App() {
  const out = useZebar(providers);
  const now = out.date?.new ?? new Date();
  const { hhmm, ss } = timeParts(now);

  return (
    <div className="clock">
      <div className="row">
        <span className="hhmm num">{hhmm}</span>
        <span className="ss num">{ss}</span>
      </div>
      <div className="rule" />
      <div className="date">{dayLabel(now)}</div>
    </div>
  );
}
