import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Activity } from '../types/crm';
import { formatDateTime } from '../lib/format';
import { LoadingState } from '../components/States';

const AUTOMATION_LOG_TYPES: Activity['activity_type'][] = ['contact_created', 'appointment_scheduled', 'appointment_completed'];

export default function Automations() {
  const [recent, setRecent] = useState<(Activity & { contact_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('activities')
      .select('*, contact:contacts(full_name)')
      .in('activity_type', AUTOMATION_LOG_TYPES)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setRecent(
          ((data as (Activity & { contact?: { full_name: string } })[]) || []).map((a) => ({ ...a, contact_name: a.contact?.full_name })),
        );
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-sk-text">Automatizaciones</h1>
        <p className="text-sm text-sk-muted">Integraciones activas del sitio público con el CRM.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-sk-border bg-sk-panel p-4 space-y-2">
          <p className="text-sm font-medium text-sk-text">Solicitud de contacto</p>
          <p className="text-xs text-sk-muted">
            Formulario y chat del sitio guardan el lead, crean/actualizan el contacto y la oportunidad (<code>pending_contact</code>), y crean
            una tarea de seguimiento. n8n manda el aviso por Gmail.
          </p>
          <p className="text-[11px] text-sk-muted-2 font-mono">N8N_LEAD_NOTIFICATION_WEBHOOK_URL</p>
        </div>
        <div className="rounded-2xl border border-sk-border bg-sk-panel p-4 space-y-2">
          <p className="text-sm font-medium text-sk-text">Agendar llamada</p>
          <p className="text-xs text-sk-muted">
            n8n consulta disponibilidad real de Google Calendar, crea el evento con Google Meet, y el backend guarda la cita
            (con Event ID y enlace de Meet) y la oportunidad pasa a <code>call_scheduled</code>.
          </p>
          <p className="text-[11px] text-sk-muted-2 font-mono">N8N_SCHEDULE_WEBHOOK_URL</p>
        </div>
      </div>

      <div className="rounded-2xl border border-sk-border bg-sk-panel p-4 space-y-2 text-xs text-sk-muted">
        <p className="text-sm font-medium text-sk-text mb-1">Configuración</p>
        <p>
          Las URLs de los webhooks de n8n, la API key de OpenAI (chat) y las credenciales de Supabase viven en{' '}
          <code>backend/.env</code> — nunca en el frontend. Los workflows importables están en{' '}
          <code>backend/n8n/*.workflow.json</code>, documentados en el README del proyecto.
        </p>
        <p>
          Este proyecto no guarda un log formal de ejecuciones de automatización (no existe una tabla{' '}
          <code>automation_runs</code>) — el feed de abajo muestra la actividad más reciente generada automáticamente por
          estos dos flujos, tomada de <Link to="/contacts" className="text-sk-purple">activities</Link>.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-sk-text">Actividad reciente</p>
        {loading ? (
          <LoadingState />
        ) : recent.length === 0 ? (
          <p className="text-xs text-sk-muted-2">Sin actividad automática todavía.</p>
        ) : (
          <div className="space-y-1.5">
            {recent.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-sk-border bg-sk-panel px-3 py-2 text-xs">
                <span className="text-sk-text">
                  {a.title} {a.contact_name && <span className="text-sk-muted">— {a.contact_name}</span>}
                </span>
                <span className="text-sk-muted-2">{formatDateTime(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
