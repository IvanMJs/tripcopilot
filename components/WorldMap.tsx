"use client";

import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { Expand } from "lucide-react";
import type { VisitedCountry } from "@/lib/visited-countries";

const GEO_URL = "/world-110m.json";

interface WorldMapProps {
  countries: VisitedCountry[];
  onExpand?: () => void;
  pinTone?: "amber" | "violet";
  interactive?: boolean;
}

export function WorldMap({ countries, onExpand, pinTone = "amber", interactive = true }: WorldMapProps) {
  const pinColor = pinTone === "amber" ? "#fbbf24" : "#8b5cf6";
  const visitedSet = new Set(countries.map(c => c.code));

  return (
    <div className="relative w-full" style={{ aspectRatio: "2/1" }}>
      <div className="absolute inset-0 rounded-xl overflow-hidden bg-gradient-to-br from-[#0a0a18] via-[#0c0c1a] to-[#080814]" />

      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 155 }}
        style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
      >
        <ZoomableGroup zoom={1} center={[0, 20]} maxZoom={interactive ? 6 : 1} minZoom={1}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => {
                // world-atlas uses numeric ISO codes; we match by checking the name prop
                // The topojson properties vary — use ISO_A2 when available
                const isoA2: string = geo.properties["ISO_A2"] ?? geo.properties["iso_a2"] ?? "";
                const isVisited = visitedSet.has(isoA2);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isVisited ? `${pinColor}22` : "rgba(139,92,246,0.06)"}
                    stroke={isVisited ? `${pinColor}66` : "rgba(139,92,246,0.15)"}
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: {
                        fill: isVisited ? `${pinColor}44` : "rgba(139,92,246,0.1)",
                        outline: "none",
                        cursor: interactive ? "pointer" : "default",
                      },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {countries.map((c, i) => (
            <Marker key={c.code} coordinates={[c.lng, c.lat]}>
              <circle r={6} fill="none" stroke={pinColor} strokeWidth={1.5} opacity={0.8}>
                <animate attributeName="r" from="6" to="22" dur="2.4s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.8" to="0" dur="2.4s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
              </circle>
              <circle r={4} fill={pinColor} />
              <circle r={2} fill="#fff" />
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>

      {onExpand && (
        <button
          onClick={onExpand}
          className="absolute bottom-2.5 right-2.5 h-8 w-8 rounded-lg bg-black/60 backdrop-blur-md border border-white/[0.1] text-white/70 hover:text-white hover:bg-black/80 flex items-center justify-center transition-colors"
          aria-label="Expandir mapa"
        >
          <Expand size={14} />
        </button>
      )}

      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-md bg-black/50 backdrop-blur-md border border-white/[0.08] px-2 py-1">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-75" />
          <span className="relative rounded-full bg-amber-400 h-1.5 w-1.5" />
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300">
          {countries.length} países
        </span>
      </div>
    </div>
  );
}
