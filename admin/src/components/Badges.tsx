import { OPPORTUNITY_STATUS_LABELS, type OpportunityStatus } from '../types/crm';

const STATUS_TONES: Record<OpportunityStatus, string> = {
  new: 'bg-sk-blue/15 text-sk-blue',
  pending_contact: 'bg-sk-amber/15 text-sk-amber',
  contacted: 'bg-sk-blue/15 text-sk-blue',
  call_scheduled: 'bg-sk-purple/15 text-sk-purple',
  call_completed: 'bg-sk-purple/15 text-sk-purple',
  proposal_pending: 'bg-sk-amber/15 text-sk-amber',
  proposal_sent: 'bg-sk-pink/15 text-sk-pink',
  negotiation: 'bg-sk-pink/15 text-sk-pink',
  deposit_pending: 'bg-sk-amber/15 text-sk-amber',
  in_progress: 'bg-sk-blue/15 text-sk-blue',
  final_payment_pending: 'bg-sk-amber/15 text-sk-amber',
  won: 'bg-sk-green/15 text-sk-green',
  lost: 'bg-sk-red/15 text-sk-red',
  no_response: 'bg-white/10 text-sk-muted',
};

export function StatusBadge({ status }: { status: OpportunityStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_TONES[status]}`}>
      {OPPORTUNITY_STATUS_LABELS[status]}
    </span>
  );
}

export function ServiceBadge({ name }: { name: string | null | undefined }) {
  if (!name) return <span className="text-sk-muted-2 text-xs">Sin servicio</span>;
  return (
    <span className="inline-flex items-center rounded-full border border-sk-border px-2.5 py-0.5 text-xs text-sk-muted whitespace-nowrap">
      {name}
    </span>
  );
}

export function OverdueTag() {
  return (
    <span className="inline-flex items-center rounded-full bg-sk-red/15 px-2 py-0.5 text-[11px] font-medium text-sk-red whitespace-nowrap">
      Seguimiento vencido
    </span>
  );
}
