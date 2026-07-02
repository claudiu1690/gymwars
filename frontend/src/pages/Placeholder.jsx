export default function Placeholder({ title, note }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--ink-muted)", padding: "56px 32px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink)" }}>{title}</div>
            <div style={{ fontSize: 12, lineHeight: 1.7, maxWidth: 260 }}>{note}</div>
        </div>
    );
}
