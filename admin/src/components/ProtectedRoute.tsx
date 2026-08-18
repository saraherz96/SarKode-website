import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Layout } from './Layout';
import { LoadingState } from './States';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, teamMember, signOut } = useAuth();

  if (session === undefined || teamMember === undefined) {
    return (
      <div className="min-h-screen bg-sk-bg flex items-center justify-center">
        <LoadingState label="Verificando sesión…" />
      </div>
    );
  }

  if (session === null) {
    return <Navigate to="/login" replace />;
  }

  if (teamMember === null) {
    return (
      <div className="min-h-screen bg-sk-bg flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-sk-text font-medium">Tu cuenta no tiene acceso al CRM</p>
          <p className="text-sk-muted text-sm">
            Iniciaste sesión correctamente, pero tu usuario no está dado de alta como parte del equipo de SarKode. Pide a
            alguien del equipo que te agregue en <code className="text-xs">team_members</code> (ver
            backend/supabase/migrations/README.md).
          </p>
          <button
            onClick={() => signOut()}
            className="rounded-lg border border-sk-border px-4 py-1.5 text-sm hover:bg-sk-panel-hover transition"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return <Layout>{children}</Layout>;
}
