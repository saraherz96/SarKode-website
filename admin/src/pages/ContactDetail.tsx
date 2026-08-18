import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getContact, updateContact } from '../services/contacts';
import { createActivity } from '../services/activities';
import type { Contact } from '../types/crm';
import { CONTACT_SOURCE_LABELS } from '../types/crm';
import { LoadingState, ErrorState } from '../components/States';
import { OpportunitiesTab } from '../components/contact/OpportunitiesTab';
import { ConversationsTab } from '../components/contact/ConversationsTab';
import { AppointmentsTab } from '../components/contact/AppointmentsTab';
import { ActivitiesTab } from '../components/contact/ActivitiesTab';
import { NotesTab } from '../components/contact/NotesTab';
import { TasksTab } from '../components/contact/TasksTab';
import { ProposalsTab } from '../components/contact/ProposalsTab';
import { PaymentsTab } from '../components/contact/PaymentsTab';
import { DocumentsTab } from '../components/contact/DocumentsTab';

const TABS = [
  'Resumen',
  'Oportunidades',
  'Conversaciones',
  'Citas',
  'Actividades',
  'Notas',
  'Tareas',
  'Propuestas',
  'Pagos',
  'Documentos',
] as const;
type Tab = (typeof TABS)[number];

function EditableField({
  label,
  value,
  onSave,
  type = 'text',
}: {
  label: string;
  value: string;
  onSave: (v: string) => Promise<void>;
  type?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <button onClick={() => { setDraft(value); setEditing(true); }} className="text-left group">
        <p className="text-xs text-sk-muted">{label}</p>
        <p className="text-sm text-sk-text group-hover:text-sk-purple">{value || '— (agregar)'}</p>
      </button>
    );
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        await onSave(draft);
        setSaving(false);
        setEditing(false);
      }}
      className="space-y-1"
    >
      <p className="text-xs text-sk-muted">{label}</p>
      <div className="flex gap-1">
        <input
          type={type}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full rounded-md border border-sk-purple/50 bg-sk-bg px-2 py-1 text-sm text-sk-text"
        />
        <button type="submit" disabled={saving} className="text-xs text-sk-purple px-2">
          OK
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-sk-muted px-1">
          ×
        </button>
      </div>
    </form>
  );
}

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('Resumen');

  function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    getContact(id)
      .then(setContact)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function patch(field: keyof Contact, value: string) {
    if (!id) return;
    await updateContact(id, { [field]: value || null } as Partial<Contact>);
    setContact((c) => (c ? { ...c, [field]: value || null } : c));
  }

  if (loading) return <LoadingState label="Cargando contacto…" />;
  if (error || !contact) return <ErrorState message={error || 'Contacto no encontrado.'} onRetry={load} />;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link to="/contacts" className="text-xs text-sk-muted hover:text-sk-purple">
          ← Contactos
        </Link>
      </div>

      <div className="rounded-2xl border border-sk-border bg-sk-panel p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-sk-text">{contact.full_name}</h1>
            <p className="text-sm text-sk-muted">{CONTACT_SOURCE_LABELS[contact.source]}</p>
          </div>
          <div className="flex gap-2">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="rounded-lg border border-sk-border px-3 py-1.5 text-xs text-sk-text hover:bg-sk-panel-hover">
                ✉ Email
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="rounded-lg border border-sk-border px-3 py-1.5 text-xs text-sk-text hover:bg-sk-panel-hover">
                ☎ Llamar
              </a>
            )}
            {contact.phone && (
              <a
                href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-sk-border px-3 py-1.5 text-xs text-sk-text hover:bg-sk-panel-hover"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <EditableField label="Email" value={contact.email || ''} onSave={(v) => patch('email', v)} type="email" />
          <EditableField label="Teléfono" value={contact.phone || ''} onSave={(v) => patch('phone', v)} />
          <EditableField label="Empresa" value={contact.company_name || ''} onSave={(v) => patch('company_name', v)} />
          <EditableField label="Puesto" value={contact.job_title || ''} onSave={(v) => patch('job_title', v)} />
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-sk-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-3 py-2 text-sm border-b-2 transition ${
              tab === t ? 'border-sk-purple text-sk-purple' : 'border-transparent text-sk-muted hover:text-sk-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        {tab === 'Resumen' && <ActivitiesTab contactId={contact.id} title="Línea de tiempo" />}
        {tab === 'Oportunidades' && <OpportunitiesTab contactId={contact.id} />}
        {tab === 'Conversaciones' && <ConversationsTab contactId={contact.id} />}
        {tab === 'Citas' && <AppointmentsTab contactId={contact.id} />}
        {tab === 'Actividades' && <ActivitiesTab contactId={contact.id} title="Actividades" />}
        {tab === 'Notas' && (
          <NotesTab
            contactId={contact.id}
            onAdd={async (text) => {
              await createActivity({ contactId: contact.id, type: 'note', title: 'Nota interna', description: text });
            }}
          />
        )}
        {tab === 'Tareas' && <TasksTab contactId={contact.id} />}
        {tab === 'Propuestas' && <ProposalsTab contactId={contact.id} />}
        {tab === 'Pagos' && <PaymentsTab contactId={contact.id} />}
        {tab === 'Documentos' && <DocumentsTab contactId={contact.id} />}
      </div>
    </div>
  );
}
