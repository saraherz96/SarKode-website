const STEPS = [
  {
    n: '01',
    title: 'Diagnóstico',
    desc: 'Mapeamos tus procesos y detectamos dónde la IA realmente ahorra tiempo.',
  },
  {
    n: '02',
    title: 'Diseño y build',
    desc: 'Construimos el agente o producto, conectado a tus herramientas reales.',
  },
  {
    n: '03',
    title: 'Entrega y soporte',
    desc: 'Lanzamos, medimos resultados y ajustamos con soporte continuo.',
  },
];

export default function Trabajamos() {
  return (
    <div id="trabajamos" className="sk-section-pad" style={{ padding: '70px 48px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="sk-trabajamos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32 }}>
        {STEPS.map((step) => (
          <div key={step.n}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#9C93F0', marginBottom: 12 }}>{step.n}</div>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>{step.title}</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
