interface Props {
  scrolled: boolean;
  onOpenContact: () => void;
}

export default function Navbar({ scrolled, onOpenContact }: Props) {
  const navStyle: React.CSSProperties = scrolled
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 40px',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08)',
        transition: 'all .3s',
      }
    : {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 40px',
        background: 'transparent',
        transition: 'all .3s',
      };

  return (
    <nav className="sk-nav" style={navStyle}>
      <img
        src="/assets/logo-frase.png"
        alt="SarKode"
        style={{ height: 38, width: 'auto', display: 'block', flexShrink: 0 }}
      />

      <div
        className="sk-navlinks"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderRadius: 14,
          padding: 6,
          position: 'relative',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08)',
        }}
      >
        <a href="#top" className="sk-nav-link sk-nav-link--active">
          Inicio
        </a>
        <a href="#servicios" className="sk-nav-link">
          Servicios
        </a>
      </div>

      <button onClick={onOpenContact} className="sk-btn-ghost">
        Contáctanos
      </button>
    </nav>
  );
}
