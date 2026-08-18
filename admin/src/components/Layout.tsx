import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/pipeline', label: 'Pipeline' },
  { to: '/contacts', label: 'Contactos' },
  { to: '/appointments', label: 'Citas' },
  { to: '/conversations', label: 'Conversaciones' },
  { to: '/tasks', label: 'Tareas' },
  { to: '/proposals', label: 'Propuestas' },
  { to: '/payments', label: 'Pagos' },
  { to: '/automations', label: 'Automatizaciones' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { teamMember, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-sk-bg text-sk-text flex">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-sk-border bg-sk-panel/60 p-4">
        <div className="mb-8 px-2">
          <p className="font-mono text-sm tracking-wide text-sk-text">SarKode</p>
          <p className="text-xs text-sk-muted-2">CRM interno</p>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm transition ${
                  isActive ? 'bg-sk-purple/15 text-sk-purple' : 'text-sk-muted hover:bg-sk-panel-hover hover:text-sk-text'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-sk-border pt-3 px-2">
          <p className="text-sm text-sk-text truncate">{teamMember?.full_name}</p>
          <p className="text-xs text-sk-muted-2 truncate mb-2">{teamMember?.email}</p>
          <button onClick={handleSignOut} className="text-xs text-sk-muted hover:text-sk-red transition">
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between border-b border-sk-border px-4 py-3">
          <p className="font-mono text-sm">SarKode CRM</p>
          <button onClick={handleSignOut} className="text-xs text-sk-muted">
            Salir
          </button>
        </header>
        <nav className="md:hidden flex gap-1 overflow-x-auto border-b border-sk-border px-3 py-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `shrink-0 rounded-full px-3 py-1 text-xs whitespace-nowrap transition ${
                  isActive ? 'bg-sk-purple/15 text-sk-purple' : 'text-sk-muted'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 min-w-0 p-4 md:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
