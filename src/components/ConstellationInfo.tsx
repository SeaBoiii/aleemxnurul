import { constellationInfo } from '../content';
import Sheet from './Sheet';

function Emphasis({ text }: { text: string }) {
  return <>{text.split(/(\*\*.*?\*\*)/).map((part, index) =>
    part.startsWith('**')
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : part,
  )}</>;
}

const legend = [
  { symbol: '✦', label: 'live site', className: 'legend-live' },
  { symbol: '⋯', label: 'draft', className: 'legend-draft' },
  { symbol: '♥', label: 'visited', className: 'legend-visited' },
  { symbol: '☆', label: "the bridge (unlit until you've found every star)", className: 'legend-bridge' },
];

export default function ConstellationInfo({ onClose, text }: { onClose: () => void; text?: string }) {
  const [title, ...paragraphs] = (text ?? constellationInfo).split('\n\n');
  // The visual legend uses the exact wording of the final paragraph in §6.
  const story = paragraphs.filter(paragraph => !paragraph.startsWith('Legend:'));

  return (
    <Sheet titleId="info-title" onClose={onClose} className="info-sheet">
      <p className="eyebrow">ABOUT THIS SKY</p>
      <h2 id="info-title">{title.replaceAll('**', '')}</h2>
      <div className="info-body">
        {story.map((paragraph, index) => <p key={index}><Emphasis text={paragraph} /></p>)}
      </div>
      <ul className="sky-legend" aria-label="Legend">
        {legend.map(item => (
          <li key={item.className}>
            <span className={item.className} aria-hidden="true">{item.symbol}</span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
