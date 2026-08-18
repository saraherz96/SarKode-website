export default function Footer() {
  return (
    <div
      id="footer"
      className="sk-footer sk-section-pad"
      style={{
        padding: '36px 48px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <img src="/assets/logo-frase.png" alt="SarKode" style={{ height: 24, width: 'auto', display: 'block' }} />
        <span style={{ fontFamily: "'JetBrains Mono',monospace", textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: 9, opacity: 0.5 }}>
          © 2026 SarKode
        </span>
      </div>
      <div style={{ display: 'flex', gap: 24 }}>
        <a href="#footer" className="sk-footer-link">
          Contacto
        </a>
        <a href="https://www.linkedin.com/company/sarkode/" target="_blank" rel="noreferrer" className="sk-footer-link">
          LinkedIn
        </a>
      </div>
    </div>
  );
}
