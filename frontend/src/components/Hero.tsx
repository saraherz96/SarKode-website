import type { RefObject } from 'react';

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
}

export default function Hero({ videoRef }: Props) {
  return (
    <div id="top" style={{ position: 'relative', width: '100%', height: '100vh', minHeight: 680, overflow: 'hidden' }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        src="/assets/sarkode-bg.mp4"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'brightness(0.75) saturate(1.05)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(20,20,26,0.35) 0%, rgba(20,20,26,0.6) 55%, rgba(20,20,26,0.95) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(120deg,#9C93F0,#F2A8C6,#A8C7F0)',
          opacity: 0.12,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }}
      />

      <div className="sk-hero-content" style={{ position: 'absolute', bottom: 0, left: 0, zIndex: 2, padding: '0 48px 88px', maxWidth: 720 }}>
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
          Software · Product · AI · Cloud
        </div>
        <h1
          style={{
            fontSize: 'clamp(32px,4.5vw,58px)',
            fontWeight: 500,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            margin: '0 0 20px',
            textWrap: 'balance',
          }}
        >
          Diseñamos ideas
          <br />
          Construimos futuros
        </h1>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 16, lineHeight: 1.65, maxWidth: 520, margin: '0 0 32px' }}>
          <p style={{ margin: 0 }}>
            Convertimos ideas en soluciones digitales funcionales, intuitivas y hechas a la medida de cada proyecto.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <a href="#servicios" className="sk-btn-primary">
            Ver servicios
          </a>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <svg
          className="sk-bounce"
          style={{ animation: 'sk-bounce 2.6s ease-in-out infinite' }}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#F6F1EC"
          strokeWidth="1.5"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: 9, opacity: 0.5 }}>
          Scroll
        </span>
      </div>
    </div>
  );
}
