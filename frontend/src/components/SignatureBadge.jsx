import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { signatureDefinition } from "../careerIdentity.mjs";
import "./signature-badge.css";

// The tooltip uses a portal so card clipping never cuts off its short effect.
export default function SignatureBadge({
  fighter,
  definitions,
  className = "",
}) {
  const ability = signatureDefinition(
    fighter?.signatureId,
    definitions,
    fighter?.signatureCombatVersion ?? fighter?.signatureAccess?.combatVersion,
  );
  const [position, setPosition] = useState(null);
  const trigger = useRef(null),
    hideTimer = useRef(null);
  const pinnedByTouch = useRef(false),
    pointerType = useRef("");
  const tooltipId = useId();
  const clearHide = () => clearTimeout(hideTimer.current);
  const close = () => {
    clearHide();
    pinnedByTouch.current = false;
    setPosition(null);
  };
  const show = () => {
    clearHide();
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(260, window.innerWidth - 24);
    const above = rect.top > 135;
    setPosition({
      width,
      left: Math.max(
        12,
        Math.min(rect.right - width, window.innerWidth - width - 12),
      ),
      top: above ? rect.top - 10 : rect.bottom + 10,
      above,
    });
  };
  const hideSoon = () => {
    clearHide();
    hideTimer.current = setTimeout(close, 150);
  };
  useEffect(() => () => clearHide(), []);
  useEffect(() => {
    if (!position) return;
    const dismiss = (event) => {
      if (event.type === "keydown" && !["Escape", "Tab"].includes(event.key))
        return;
      if (
        event.type === "pointerdown" &&
        (trigger.current?.contains(event.target) ||
          document.getElementById(tooltipId)?.contains(event.target))
      )
        return;
      close();
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismiss);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [!!position, tooltipId]);
  if (!ability) return null;
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`fighter-signature-badge ${className}`}
        aria-label={`${fighter.name} signature: ${ability.name}`}
        aria-describedby={position ? tooltipId : undefined}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") show();
        }}
        onPointerDown={(event) => {
          pointerType.current = event.pointerType;
          pinnedByTouch.current = event.pointerType === "touch";
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "touch" && !pinnedByTouch.current)
            hideSoon();
        }}
        onFocus={show}
        onBlur={() => {
          if (!pinnedByTouch.current) close();
        }}
        onClick={(event) => {
          event.stopPropagation();
          pinnedByTouch.current =
            event.detail > 0 && pointerType.current === "touch";
          show();
        }}
      >
        <img
          src={`/art/abilities/${fighter.signatureId}.webp`}
          width="48"
          height="48"
          alt=""
          loading="lazy"
        />
      </button>
      {position &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            className="fighter-signature-tooltip"
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
              transform: position.above ? "translateY(-100%)" : undefined,
            }}
            onPointerEnter={clearHide}
            onPointerLeave={hideSoon}
          >
            <strong>{ability.name}</strong>
            <span>{ability.effect}</span>
          </div>,
          document.body,
        )}
    </>
  );
}
