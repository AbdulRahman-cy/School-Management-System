import { useEffect } from "react";

// ─── Toast Notification System ───────────────────────────────────────────────

export interface ToastMessage {
  id: number;
  message: string;
  type: "error" | "success";
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 10, maxWidth: 420, width: "100%", pointerEvents: "none",
    }}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const isError = toast.type === "error";

  return (
    <div style={{
      pointerEvents: "auto",
      display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
      padding: "14px 18px", borderRadius: 12,
      background: isError ? "#fff1f2" : "#f0fdf4",
      border: `1.5px solid ${isError ? "#fecdd3" : "#bbf7d0"}`,
      color: isError ? "#9f1239" : "#166534",
      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
      fontSize: 12.5, fontWeight: 600, lineHeight: 1.4,
      animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>{isError ? "⚠️" : "✓"}</span>
        <span>{toast.message}</span>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          border: "none", background: "transparent",
          color: isError ? "#9f1239" : "#166534",
          cursor: "pointer", fontSize: 14, fontWeight: 700, padding: 0, marginLeft: 4, flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
