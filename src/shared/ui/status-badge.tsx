// Família de cores de status da identidade "Navy Confiança" — separada da marca, só em
// selo. Um único componente porque é a peça mais repetida da interface (padrão exigido em
// REQUISITOSEREGRAS.MD §8.4: "identificação visual clara dos status").

export type StatusTone = "ok" | "pending" | "danger" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  ok: "bg-status-ok-bg text-status-ok-text",
  pending: "bg-status-pending-bg text-status-pending-text",
  danger: "bg-status-danger-bg text-status-danger-text",
  neutral: "bg-status-neutral-bg text-status-neutral-text",
};

export function StatusBadge({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
