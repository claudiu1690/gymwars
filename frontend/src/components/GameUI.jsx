import { useEffect, useId, useRef } from "react";
import "./game-ui.css";

export function GameDialog({ open, onClose, title, children }) {
  const dialog = useRef(null);
  const heading = useId();
  useEffect(() => {
    const node = dialog.current;
    if (!open || !node) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      node.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="gw-game-dialog"
      aria-labelledby={heading}
      onKeyDown={(event) => {
        if (
          event.key !== "Tab" ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey
        )
          return;
        const targets = [
          ...event.currentTarget.querySelectorAll(
            'a[href], button, input, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ].filter(
          (node) => !node.matches(":disabled") && node.getClientRects().length,
        );
        const first = targets[0],
          last = targets.at(-1);
        if (!first) {
          event.preventDefault();
          event.currentTarget.focus();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !event.currentTarget.contains(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !event.currentTarget.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <header className="gw-dialog-heading">
        <h2 id={heading}>{title}</h2>
        <button type="button" onClick={onClose} aria-label={`Close ${title}`}>
          Close ✕
        </button>
      </header>
      <div className="gw-dialog-content">{children}</div>
    </dialog>
  );
}

export function ChoiceCards({ label, options, value, onChange, disabled }) {
  return (
    <div className="gw-choice-cards" role="group" aria-label={label}>
      <strong>{label}</strong>
      <div>
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            aria-pressed={value === option.value}
            disabled={disabled || option.disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GameTabs({ label, tabs, value, onChange, prefix }) {
  return (
    <div className="gw-game-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab, index) => (
        <button
          type="button"
          key={tab.id}
          id={`${prefix}-${tab.id}-tab`}
          role="tab"
          aria-selected={value === tab.id}
          aria-controls={`${prefix}-${tab.id}-panel`}
          tabIndex={value === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => {
            const offset =
              event.key === "ArrowRight"
                ? 1
                : event.key === "ArrowLeft"
                  ? -1
                  : 0;
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? tabs.length - 1
                  : offset
                    ? (index + offset + tabs.length) % tabs.length
                    : null;
            if (next === null) return;
            event.preventDefault();
            onChange(tabs[next].id);
            event.currentTarget.parentElement.children[next].focus();
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
