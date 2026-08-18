export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-12 justify-center text-sk-muted text-sm">
      <span className="h-4 w-4 rounded-full border-2 border-sk-purple/40 border-t-sk-purple animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-sk-red text-sm max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg border border-sk-border px-4 py-1.5 text-sm text-sk-text hover:bg-sk-panel-hover transition"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-12 text-center">
      <p className="text-sk-text text-sm font-medium">{title}</p>
      {description && <p className="text-sk-muted text-xs max-w-sm">{description}</p>}
    </div>
  );
}
