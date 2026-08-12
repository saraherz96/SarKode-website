interface Props {
  onOpenContact: () => void;
}

export default function CtaFinal({ onOpenContact }: Props) {
  return (
    <div style={{ padding: '130px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden', background: '#1c1c24' }}>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 520,
          height: 280,
          background: 'linear-gradient(90deg,#9C93F0,#F2A8C6,#A8C7F0)',
          filter: 'blur(90px)',
          opacity: 0.2,
          pointerEvents: 'none',
        }}
      />
      <h2 style={{ position: 'relative', fontSize: 'clamp(26px,3.2vw,38px)', fontWeight: 500, margin: '0 0 28px' }}>
        ¿Construimos lo que sigue?
      </h2>
      <button onClick={onOpenContact} className="sk-btn-primary" style={{ position: 'relative', display: 'inline-block', padding: '16px 34px', fontSize: 16, border: 'none' }}>
        Book a call
      </button>
    </div>
  );
}
