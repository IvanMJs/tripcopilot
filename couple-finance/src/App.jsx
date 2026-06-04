import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { useSheetData } from "./hooks/useSheetData";
import { fmt, pct } from "./lib/format";
import { IVAN, MICA } from "./lib/sheets";
import CustomTooltip from "./components/CustomTooltip";

const IVAN_COLOR = "#7EB8D4";
const MICA_COLOR = "#D4A574";
const COLORS_IVAN = ["#7EB8D4", "#5A9BBF", "#3A7FA8", "#1E6490", "#0A4A6E"];
const COLORS_MICA = ["#D4A574", "#BF8A52", "#A06B35", "#7A4E20", "#563310"];

const TABS = ["Resumen", "Detalle", "Historial"];

const pickColor = (palette, i) => palette[i % palette.length];

export default function App() {
  const { data, loading, error, reload } = useSheetData();
  const [tab, setTab] = useState("Resumen");
  const [monthKey, setMonthKey] = useState(null);

  const months = data?.months ?? [];

  // Mes seleccionado: el elegido, o el más reciente por defecto.
  const month = useMemo(() => {
    if (months.length === 0) return null;
    return months.find((m) => m.key === monthKey) ?? months[months.length - 1];
  }, [months, monthKey]);

  if (loading) return <Shell><Centered>{<Spinner />}</Centered></Shell>;
  if (error) return <Shell><ErrorState message={error} onRetry={reload} /></Shell>;
  if (!month) return <Shell><ErrorState message="No hay datos para mostrar." onRetry={reload} /></Shell>;

  const ivan = month.people[IVAN] ?? { ars: 0, usd: 0, unified: 0 };
  const mica = month.people[MICA] ?? { ars: 0, usd: 0, unified: 0 };
  const combined = month.combined || 0;
  const ivanPct = parseFloat(pct(ivan.unified, combined));
  const micaPct = parseFloat(pct(mica.unified, combined));

  return (
    <Shell>
      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: -100, left: -100, width: 400, height: 400,
        background: "radial-gradient(circle, rgba(126,184,212,0.06) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", top: 200, right: -150, width: 350, height: 350,
        background: "radial-gradient(circle, rgba(212,165,116,0.05) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Header */}
      <div style={{ position: "relative", zIndex: 1, padding: "52px 24px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 6 }}>
              Finanzas en pareja
            </div>
            <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: -0.5, color: "#F0F0F0" }}>
              Iván <span style={{ color: "rgba(255,255,255,0.25)" }}>&</span> Mica
            </div>
          </div>
          <MonthSelector months={months} value={month.key} onChange={setMonthKey} />
        </div>

        {/* Hero total */}
        <div style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
          border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "24px",
          backdropFilter: "blur(20px)",
        }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 8 }}>
            Total invertido juntos
          </div>
          <div style={{ fontSize: 36, fontWeight: 300, letterSpacing: -1, color: "#F0F0F0", marginBottom: 4 }}>
            {fmt(combined)}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
            {month.totalUsd > 0
              ? `Incluye USD ${month.totalUsd.toFixed(2)} convertidos a $${data.tc.toLocaleString("es-AR")}`
              : `Tipo de cambio USD $${data.tc.toLocaleString("es-AR")}`}
          </div>

          {/* Distribution bar */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", background: "rgba(255,255,255,0.05)" }}>
              <div style={{ width: `${ivanPct}%`, background: "linear-gradient(90deg, #5A9BBF, #7EB8D4)" }} />
              <div style={{ width: 2, background: "#080810" }} />
              <div style={{ flex: 1, background: "linear-gradient(90deg, #D4A574, #BF8A52)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7EB8D4" }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Iván</span>
                <span style={{ fontSize: 12, color: "#7EB8D4", fontWeight: 500 }}>{ivanPct}%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "#D4A574", fontWeight: 500 }}>{micaPct}%</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Mica</span>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4A574" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", padding: "0 24px", marginBottom: 24, gap: 4 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, background: tab === t ? "rgba(255,255,255,0.07)" : "transparent",
            border: tab === t ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
            color: tab === t ? "#F0F0F0" : "rgba(255,255,255,0.3)",
            fontSize: 12, padding: "10px 8px", cursor: "pointer",
            borderRadius: 10, letterSpacing: 0.3, transition: "all 0.2s",
          }}>{t}</button>
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 1, padding: "0 24px 40px" }}>
        {tab === "Resumen" && <Resumen ivan={ivan} mica={mica} combined={combined} ivanPct={ivanPct} micaPct={micaPct} totalUsd={month.totalUsd} />}
        {tab === "Detalle" && <Detalle categories={month.categories} />}
        {tab === "Historial" && <Historial historic={data.historic} months={months} />}
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Tab: Resumen
// ---------------------------------------------------------------------------
function Resumen({ ivan, mica, combined, ivanPct, micaPct, totalUsd }) {
  const cards = [
    {
      name: "Iván", total: ivan.unified, usd: ivan.usd, pct: ivanPct, color: "#7EB8D4",
      bg: "rgba(126,184,212,0.05)", border: "rgba(126,184,212,0.12)", grad: "linear-gradient(90deg, #3A7FA8, #7EB8D4)",
    },
    {
      name: "Mica", total: mica.unified, usd: mica.usd, pct: micaPct, color: "#D4A574",
      bg: "rgba(212,165,116,0.05)", border: "rgba(212,165,116,0.12)", grad: "linear-gradient(90deg, #A06B35, #D4A574)",
    },
  ];

  const leader = ivan.unified >= mica.unified ? "Iván" : "Mica";
  const diff = Math.abs(ivan.unified - mica.unified);

  const insights = [
    { label: `${leader} aportó más por`, value: fmt(diff), color: leader === "Iván" ? "#7EB8D4" : "#D4A574" },
    { label: "Promedio por persona", value: fmt(combined / 2), color: "rgba(255,255,255,0.5)" },
  ];
  if (totalUsd > 0) insights.push({ label: "Gasto en USD", value: `USD ${totalUsd.toFixed(2)}`, color: "#D4A574" });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {cards.map((p) => (
          <div key={p.name} style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 16, padding: "18px 14px" }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: p.color, textTransform: "uppercase", marginBottom: 10 }}>{p.name}</div>
            <div style={{ fontSize: 18, fontWeight: 400, color: "#F0F0F0", lineHeight: 1.2, marginBottom: 4 }}>{fmt(p.total)}</div>
            {p.usd > 0
              ? <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 10 }}>incl. USD {p.usd.toFixed(2)}</div>
              : <div style={{ marginBottom: 10 }} />}
            <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ width: `${p.pct}%`, height: "100%", background: p.grad }} />
            </div>
            <div style={{ fontSize: 11, color: p.color, marginTop: 6, opacity: 0.8 }}>{p.pct}%</div>
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "18px" }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: 12 }}>Este mes</div>
        {insights.map((s, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0",
            borderBottom: i < insights.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
          }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{s.label}</span>
            <span style={{ fontSize: 13, color: s.color, fontWeight: 500 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Detalle por categoría
// ---------------------------------------------------------------------------
function Detalle({ categories }) {
  const groups = [
    { person: "Iván", color: "#7EB8D4", palette: COLORS_IVAN, data: categories[IVAN] ?? [] },
    { person: "Mica", color: "#D4A574", palette: COLORS_MICA, data: categories[MICA] ?? [] },
  ];

  return (
    <div>
      {groups.map((g, gi) => (
        <div key={g.person} style={{ marginBottom: gi === 0 ? 24 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: g.color }} />
            <span style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
              {g.person} — categorías
            </span>
          </div>

          {g.data.length === 0 ? (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", padding: "16px 0" }}>Sin gastos registrados este mes.</div>
          ) : (
            <>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={g.data} cx="40%" cy="50%" innerRadius={45} outerRadius={72}
                      dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
                      {g.data.map((_, i) => <Cell key={i} fill={pickColor(g.palette, i)} strokeWidth={0} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={6}
                      formatter={(v) => <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {g.data.map((c, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: pickColor(g.palette, i) }} />
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{c.name}</span>
                  </div>
                  <span style={{ fontSize: 13, color: "#E0E0E0" }}>{fmt(c.value)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Historial mes a mes
// ---------------------------------------------------------------------------
function Historial({ historic, months }) {
  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: 16 }}>
        Evolución mensual
      </div>
      <div style={{ height: 220, marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={historic} barGap={6} barSize={32}>
            <XAxis dataKey="mes" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
            <Legend iconType="circle" iconSize={6}
              formatter={(v) => <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{v}</span>} />
            <Bar dataKey={IVAN} fill={IVAN_COLOR} radius={[4, 4, 0, 0]} opacity={0.9} />
            <Bar dataKey={MICA} fill={MICA_COLOR} radius={[4, 4, 0, 0]} opacity={0.9} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {[...months].reverse().map((m) => (
        <div key={m.key} style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 16, padding: "16px", marginBottom: 12,
        }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: 12 }}>
            {m.label}
          </div>
          {[
            { label: "Total conjunto", value: fmt(m.combined) },
            { label: "Iván", value: fmt(m.people[IVAN]?.unified || 0), color: "#7EB8D4" },
            { label: "Mica", value: fmt(m.people[MICA]?.unified || 0), color: "#D4A574" },
          ].map((s, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              padding: "8px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{s.label}</span>
              <span style={{ fontSize: 13, color: s.color || "#F0F0F0" }}>{s.value}</span>
            </div>
          ))}
        </div>
      ))}

      <div style={{
        background: "rgba(126,184,212,0.04)", border: "1px solid rgba(126,184,212,0.08)",
        borderRadius: 12, padding: "14px 16px", fontSize: 12,
        color: "rgba(255,255,255,0.3)", lineHeight: 1.6, textAlign: "center",
      }}>
        Cada hoja nueva (ej. "Junio-2026") aparece acá automáticamente
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selector de mes
// ---------------------------------------------------------------------------
function MonthSelector({ months, value, onChange }) {
  return (
    <div style={{
      position: "relative", background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "6px 14px",
    }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none", WebkitAppearance: "none", background: "transparent",
          border: "none", color: "rgba(255,255,255,0.6)", fontSize: 12,
          fontFamily: "inherit", outline: "none", cursor: "pointer", paddingRight: 14,
        }}
      >
        {[...months].reverse().map((m) => (
          <option key={m.key} value={m.key} style={{ background: "#15151f", color: "#E8E8E8" }}>
            {m.label}
          </option>
        ))}
      </select>
      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 9, color: "rgba(255,255,255,0.4)" }}>▼</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout + estados
// ---------------------------------------------------------------------------
function Shell({ children }) {
  return (
    <div style={{
      minHeight: "100vh", background: "#080810",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", color: "#E8E8E8",
      maxWidth: 430, margin: "0 auto", position: "relative", overflow: "hidden",
    }}>
      {children}
    </div>
  );
}

function Centered({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 32, height: 32, margin: "0 auto 16px", borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#7EB8D4",
        animation: "cf-spin 0.8s linear infinite",
      }} />
      <div style={{ fontSize: 12, letterSpacing: 1, color: "rgba(255,255,255,0.3)" }}>Cargando datos…</div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <Centered>
      <div style={{ textAlign: "center", maxWidth: 320 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: "#D4A574", textTransform: "uppercase", marginBottom: 12 }}>
          No se pudieron cargar los datos
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 20 }}>{message}</div>
        <button onClick={onRetry} style={{
          background: "rgba(126,184,212,0.1)", border: "1px solid rgba(126,184,212,0.2)",
          color: "#7EB8D4", fontSize: 12, padding: "10px 24px", borderRadius: 10, cursor: "pointer",
        }}>Reintentar</button>
      </div>
    </Centered>
  );
}
