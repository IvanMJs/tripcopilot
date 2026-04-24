"use client";

const A = "#FFB800";
const A55 = "rgba(255,184,0,.55)";
const T45 = "rgba(232,232,240,.45)";
const MONO = "'JetBrains Mono','Courier New',monospace";

export type Screen = "board" | "share" | "public";

interface BottomNavProps {
  active: Screen;
  onChange: (s: Screen) => void;
}

const TABS: { id: Screen; label: string; icon: string }[] = [
  { id: "board",  label: "MIS VUELOS", icon: "✈" },
  { id: "share",  label: "COMPARTIR",  icon: "⬡" },
  { id: "public", label: "PÚBLICO",    icon: "◎" },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <div
      style={{
        display: "flex",
        borderTop: `1px solid rgba(255,255,255,.06)`,
        background: "#0a0a12",
        flexShrink: 0,
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              padding: "12px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              borderTop: `2px solid ${isActive ? A : "transparent"}`,
              transition: "border-color .2s",
            }}
          >
            <span style={{ fontSize: 16, color: isActive ? A : T45 }}>{tab.icon}</span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: isActive ? A55 : T45,
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
