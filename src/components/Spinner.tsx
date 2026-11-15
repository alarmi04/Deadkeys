/** Anillo de latón con un arco que gira; el texto de `label` lo leen los lectores de pantalla. */
export function Spinner({ size = 28, label }: { size?: number; label: string }) {
  return (
    <span role="status" aria-label={label} className="spinner" style={{ width: size, height: size }} />
  );
}

/** Bloque de carga centrado: spinner con un texto debajo. Para los `fallback` de Suspense. */
export function LoadingState({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div
      aria-busy="true"
      className={`flex min-h-48 flex-col items-center justify-center gap-4 py-12 text-ivory-dim ${className}`}
    >
      <Spinner size={44} label={label} />
      <p className="text-sm uppercase tracking-[0.16em]">{label}</p>
    </div>
  );
}
