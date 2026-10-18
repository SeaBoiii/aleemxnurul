import { useEffect, useState } from 'react';
import { useReducedMotion } from '../lib/hooks';

const wedding = Date.parse('2027-08-21T00:00:00+08:00');

function getRemaining() {
  const minutes = Math.max(0, Math.floor((wedding - Date.now()) / 60_000));
  return {
    days: Math.floor(minutes / 1440),
    hours: Math.floor((minutes % 1440) / 60),
    minutes: minutes % 60,
  };
}

function FlapDigit({ digit, animate }: { digit: string; animate: boolean }) {
  return (
    <span className={`flap-digit${animate ? ' can-flip' : ''}`} key={digit} aria-hidden="true">
      <span className="flap-number">{digit}</span>
      <span className="flap-top" data-digit={digit} />
      <span className="flap-hinge" />
    </span>
  );
}

export function Countdown() {
  const [remaining, setRemaining] = useState(getRemaining);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const interval = window.setInterval(() => {
      const next = getRemaining();
      setRemaining((current) => current.days === next.days && current.hours === next.hours && current.minutes === next.minutes ? current : next);
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const groups = [
    { label: 'days', value: String(remaining.days).padStart(3, '0') },
    { label: 'hours', value: String(remaining.hours).padStart(2, '0') },
    { label: 'min', value: String(remaining.minutes).padStart(2, '0') },
  ];

  return (
    <section className="countdown-section lower-scene" aria-labelledby="countdown-heading">
      <div className="departure-heading"><span aria-hidden="true">↗</span><p className="eyebrow">OUR NEXT DEPARTURE</p><span aria-hidden="true">↗</span></div>
      <h2 id="countdown-heading">A lifetime, <em>boarding soon.</em></h2>
      <div className="departure-board" role="timer" aria-label={`${remaining.days} days, ${remaining.hours} hours and ${remaining.minutes} minutes until our Nikah`}>
        <div className="departure-board-top"><span>ALEEM &amp; NURULAIN</span><span aria-hidden="true">A &amp; N</span></div>
        <div className="flap-groups">
          {groups.map((group) => (
            <div className="flap-group" key={group.label}>
              <div className="flap-digits">
                {Array.from(group.value).map((digit, index) => <FlapDigit digit={digit} animate={!reducedMotion} key={`${index}-${digit}`} />)}
              </div>
              <span className="flap-label" aria-hidden="true">{group.label}</span>
            </div>
          ))}
        </div>
        <div className="departure-board-bottom"><span>DESTINATION: FOREVER</span><span aria-hidden="true">✈</span></div>
      </div>
      <time className="wedding-date" dateTime="2027-08-21">21 August 2027</time>
      <p className="wedding-meta">Nikah <span aria-hidden="true">·</span> Singapore time</p>
    </section>
  );
}

export default Countdown;
