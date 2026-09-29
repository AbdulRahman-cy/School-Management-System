import { useId, type ReactNode } from "react";

// ─── Coming-soon wrapper ──────────────────────────────────────────────────────
// Wraps a visually-disabled control and shows a tooltip on hover or keyboard
// focus, so unfinished features read as intentional rather than broken.
//
// Why a wrapper instead of `title` on the button: browsers don't dispatch mouse
// events to disabled buttons (so native tooltips/hover are unreliable there).
// The wrapper disables pointer events on its child and takes the hover itself.
// Styles live in index.css under `.coming-soon`.

export function ComingSoon({
  children,
  label = "Coming Soon",
  placement = "bottom",
  block = false,
}: {
  children: ReactNode;
  label?: string;
  placement?: "top" | "bottom" | "left";
  block?: boolean;
}) {
  const tipId = useId();
  return (
    <span
      className={`coming-soon coming-soon--${placement}${block ? " coming-soon--block" : ""}`}
      tabIndex={0}
      aria-describedby={tipId}
    >
      {children}
      <span id={tipId} role="tooltip" className="coming-soon__tip">{label}</span>
    </span>
  );
}
