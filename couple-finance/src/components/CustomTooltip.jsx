import { fmt } from "../lib/format";

/** Tooltip oscuro tipo "glass" para los charts de recharts. */
export default function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: "rgba(15,15,25,0.95)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        padding: "12px 16px",
        backdropFilter: "blur(10px)",
      }}
    >
      {label && (
        <div style={{ fontSize: 11, color: "#666", marginBottom: 8, letterSpacing: 1 }}>
          {label}
        </div>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />
          <span style={{ fontSize: 12, color: "#999" }}>{p.name}:</span>
          <span style={{ fontSize: 13, color: "#E8E8E8", fontWeight: 500 }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}
