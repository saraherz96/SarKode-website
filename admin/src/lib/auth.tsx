import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'sales' | 'ops';
  is_active: boolean;
}

interface AuthState {
  /** `undefined` mientras se resuelve la sesión inicial, `null` si no hay sesión. */
  session: Session | null | undefined;
  /** El renglón de `team_members` de la persona logueada. `null` si inició sesión con una
   * cuenta de Supabase Auth que no está dada de alta como equipo (ver
   * backend/supabase/migrations/README.md — "Dar de alta a alguien del equipo"). */
  teamMember: TeamMember | null | undefined;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [teamMember, setTeamMember] = useState<TeamMember | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) {
      setTeamMember(null);
      return;
    }
    setTeamMember(undefined);
    supabase
      .from('team_members')
      .select('id, full_name, email, role, is_active')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('[admin] error cargando team_members:', error.message);
          setTeamMember(null);
          return;
        }
        setTeamMember((data as TeamMember | null) ?? null);
      });
  }, [session]);

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  return <AuthContext.Provider value={{ session, teamMember, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
