import type { Service } from '../types';
import ServiceIcon from './ServiceIcon';

interface Props {
  open: boolean;
  cardsVisible: boolean;
  services: Service[];
  onClose: () => void;
  onSelect: (id: number) => void;
}

function cardEnterStyle(visible: boolean, index: number): React.CSSProperties {
  const delay = (index * 0.08).toFixed(2);
  return {
    transition: 'opacity .5s ease, transform .5s ease',
    transitionDelay: `${delay}s`,
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(20px)',
  };
}

export default function ServicesModal({ open, cardsVisible, services, onClose, onSelect }: Props) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(10,10,12,0.8)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="sk-modal-card"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 900,
          maxHeight: '85vh',
          borderRadius: 28,
          background: 'rgba(28,28,36,0.94)',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <button onClick={onClose} className="sk-modal-close" aria-label="Cerrar">
          ✕
        </button>

        <div className="sk-modal-head" style={{ padding: '32px 40px 20px', flexShrink: 0 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: 11, opacity: 0.65 }}>
            Nuestros servicios
          </div>
        </div>

        <div className="sk-scroll sk-modal-inner" style={{ overflowY: 'auto', padding: '0 40px 40px' }}>
          <div className="sk-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, width: '100%' }}>
            {services.map((s, i) => (
              <div
                key={s.id}
                className="sk-modal-item"
                onClick={() => onSelect(s.id)}
                style={{ position: 'relative', minHeight: 300, cursor: 'pointer', ...cardEnterStyle(cardsVisible, i) }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: -10,
                    background: s.gradient,
                    opacity: 0.35,
                    filter: 'blur(40px)',
                    borderRadius: 32,
                    pointerEvents: 'none',
                  }}
                />
                <div style={{ position: 'relative', height: '100%', borderRadius: 24, padding: 2, background: s.gradient }}>
                  <div style={{ background: '#1c1c24', borderRadius: 22, height: '100%', padding: 28, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: 10, opacity: 0.6 }}>
                        {s.tag}
                      </span>
                      <div className="sk-modal-card-arrow" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(14px)', width: 36, height: 36, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="7" y1="17" x2="17" y2="7"></line>
                          <polyline points="7 7 17 7 17 17"></polyline>
                        </svg>
                      </div>
                    </div>
                    <ServiceIcon icon={s.icon} size={36} stroke="#F6F1EC" style={{ opacity: 0.9, marginBottom: 16 }} />
                    <h4 style={{ fontSize: 19, fontWeight: 600, margin: '0 0 6px', letterSpacing: '-0.01em' }}>{s.title}</h4>
                    <p style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: '0 0 10px' }}>{s.quote}</p>
                    <p style={{ color: '#9ba0ac', fontSize: 13, lineHeight: 1.6, margin: 0, flex: 1 }}>{s.longDesc}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 14 }}>
                      {s.pills.map((pill) => (
                        <span
                          key={pill}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            lineHeight: 1,
                            background: 'rgba(255,255,255,0.05)',
                            backdropFilter: 'blur(14px)',
                            padding: '6px 12px',
                            borderRadius: 999,
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.7)',
                          }}
                        >
                          {pill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
