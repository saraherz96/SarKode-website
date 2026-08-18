import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const err = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      setError('Email o contraseña incorrectos.');
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-sk-bg flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-sk-border bg-sk-panel p-8 space-y-5">
        <div>
          <p className="font-mono text-lg text-sk-text">SarKode</p>
          <p className="text-sm text-sk-muted">Inicia sesión en el CRM interno</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs text-sk-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-sk-border bg-sk-bg px-3 py-2 text-sm text-sk-text outline-none focus:border-sk-purple"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs text-sk-muted">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-sk-border bg-sk-bg px-3 py-2 text-sm text-sk-text outline-none focus:border-sk-purple"
          />
        </div>

        {error && <p className="text-sk-red text-xs">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-sk-purple px-4 py-2 text-sm font-medium text-sk-bg transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="text-[11px] text-sk-muted-2 text-center">
          Acceso exclusivo para el equipo de SarKode. Si no tienes cuenta, pide que te den de alta.
        </p>
      </form>
    </div>
  );
}
