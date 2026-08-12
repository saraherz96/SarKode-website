import type { RefObject } from 'react';
import type { HeadingWord, Service } from '../types';
import ServiceIcon from './ServiceIcon';

interface Props {
  headingRef: RefObject<HTMLHeadingElement | null>;
  headingWords: HeadingWord[];
  services: Service[];
  onCardClick: (id: number) => void;
}

export default function Services({ headingRef, headingWords, services, onCardClick }: Props) {
  return (
    <div id="servicios" className="sk-section-pad" style={{ padding: '110px 48px', background: '#14141a' }}>
      <div
        style={{
          fontFamily: "'JetBrains Mono',monospace",
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          fontSize: 11,
          opacity: 0.65,
          marginBottom: 18,
        }}
      >
        Qué hacemos
      </div>
      <h2
        ref={headingRef}
        style={{
          fontSize: 'clamp(26px,3vw,38px)',
          fontWeight: 500,
          letterSpacing: '-0.01em',
          maxWidth: 560,
          margin: '0 0 12px',
          textWrap: 'balance',
        }}
      >
        {headingWords.map((w, i) => (
          <span key={i} style={{ color: w.active ? '#F6F1EC' : 'rgba(246,241,236,0.18)', transition: 'color .25s ease' }}>
            {w.text}
          </span>
        ))}
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, maxWidth: 420, margin: '0 0 40px' }}>
        Soluciones digitales funcionales, claras y hechas a tu medida.
      </p>

      <div className="sk-services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {services.map((s) => (
          <div key={s.id} className="sk-flip-card" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => onCardClick(s.id)}>
            <div
              style={{
                position: 'absolute',
                inset: -8,
                background: s.gradient,
                opacity: 0.3,
                filter: 'blur(30px)',
                borderRadius: 24,
                pointerEvents: 'none',
              }}
            />
            <div style={{ position: 'relative', borderRadius: 20, padding: 2, background: s.gradient, height: 200, overflow: 'hidden' }}>
              <div className="sk-flip-front" style={{ background: '#1c1c24', borderRadius: 18, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, textAlign: 'center' }}>
                <ServiceIcon icon={s.icon} size={26} stroke={s.color} />
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{s.title}</h3>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.4 }}>{s.shortDesc}</p>
              </div>
              <div className="sk-flip-back" style={{ position: 'absolute', inset: 0, background: '#1c1c24', borderRadius: 18, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 18 }}>
                <p style={{ fontStyle: 'italic', color: '#A8C7F0', fontSize: 12, margin: '0 0 8px' }}>{s.quote}</p>
                <p style={{ color: '#9ba0ac', fontSize: 12, lineHeight: 1.5, margin: 0 }}>{s.longDesc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
