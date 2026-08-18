import { useEffect, useState } from 'react';
import { listOpportunitiesForContact } from '../../services/opportunities';
import { listProposals } from '../../services/proposals';
import { listAppointmentsForContact } from '../../services/appointments';
import type { Proposal, Appointment } from '../../types/crm';
import { formatDate } from '../../lib/format';
import { LoadingState, EmptyState } from '../States';

/** No existe una tabla `documents` dedicada en el esquema (ver backend/supabase/migrations/) —
 * esta pestaña reúne los archivos que ya vive en el CRM: los PDFs de propuestas y los enlaces
 * de Google Meet de las citas, para tener un solo lugar donde verlos. */
export function DocumentsTab({ contactId }: { contactId: string }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([listOpportunitiesForContact(contactId), listAppointmentsForContact(contactId)])
      .then(async ([opps, appts]) => {
        const props = (await Promise.all(opps.map((o) => listProposals({ opportunityId: o.id })))).flat();
        setProposals(props.filter((p) => p.file_url));
        setAppointments(appts.filter((a) => a.google_meet_url));
      })
      .finally(() => setLoading(false));
  }, [contactId]);

  if (loading) return <LoadingState />;
  if (proposals.length === 0 && appointments.length === 0) return <EmptyState title="Sin documentos" description="Los PDFs de propuestas y enlaces de Meet aparecerán aquí." />;

  return (
    <div className="space-y-2">
      {proposals.map((p) => (
        <a key={p.id} href={p.file_url!} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-sk-border bg-sk-panel p-3 text-sm hover:bg-sk-panel-hover">
          <span className="text-sk-text">📄 Propuesta {p.proposal_number}</span>
          <span className="text-xs text-sk-muted-2">{formatDate(p.created_at)}</span>
        </a>
      ))}
      {appointments.map((a) => (
        <a key={a.id} href={a.google_meet_url!} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-sk-border bg-sk-panel p-3 text-sm hover:bg-sk-panel-hover">
          <span className="text-sk-text">🔗 Google Meet — {formatDate(a.starts_at)}</span>
          <span className="text-xs text-sk-muted-2">Cita</span>
        </a>
      ))}
    </div>
  );
}
