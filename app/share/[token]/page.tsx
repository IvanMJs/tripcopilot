import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Plane, Calendar, MapPin } from "lucide-react";
import { SharedTripFlight, SharedTripAccommodation } from "@/lib/tripShare";
import { getTripByShareToken } from "@/lib/tripShareServer";
import { AIRPORTS } from "@/lib/airports";
import { AutoRefresh } from "./AutoRefresh";
import { InstallBanner } from "./InstallBanner";
import { SharedTripReactions } from "@/components/SharedTripReactions";

// ── i18n ──────────────────────────────────────────────────────────────────────

const LABELS = {
  es: {
    liveBadge:       "Seguimiento en vivo",
    flight:          (n: number) => `Vuelo ${n}`,
    completed:       "Completado",
    today:           "Hoy",
    tomorrow:        "Mañana",
    inDays:          (n: number) => `En ${n} días`,
    flights:         (n: number) => `${n} ${n === 1 ? "vuelo" : "vuelos"}`,
    stays:           (n: number) => `${n} ${n === 1 ? "alojamiento" : "alojamientos"}`,
    noFlights:       "Sin vuelos en este viaje.",
    ctaLabel:        "Monitorea tus vuelos en tiempo real",
    ctaBody:         "Abrí TripCopilot para ver alertas, clima y más",
    ctaBtn:          "Abrir en TripCopilot",
    footer:          "Esta página se actualiza automáticamente cada 2 minutos.",
    sharedWith:      "Compartido con",
    socialProof:     (n: number) => `Más de ${n.toLocaleString("es-AR")} viajeros usan TripCopilot`,
    timeline:        "Itinerario",
    totalDays:       (n: number) => `${n} ${n === 1 ? "día" : "días"}`,
    destinations:    (n: number) => `${n} ${n === 1 ? "destino" : "destinos"}`,
    checkIn:         "Check-in",
    checkOut:        "Check-out",
  },
  en: {
    liveBadge:       "Live tracking",
    flight:          (n: number) => `Flight ${n}`,
    completed:       "Completed",
    today:           "Today",
    tomorrow:        "Tomorrow",
    inDays:          (n: number) => `In ${n} days`,
    flights:         (n: number) => `${n} ${n === 1 ? "flight" : "flights"}`,
    stays:           (n: number) => `${n} ${n === 1 ? "stay" : "stays"}`,
    noFlights:       "No flights in this trip.",
    ctaLabel:        "Track your flights in real time",
    ctaBody:         "Open TripCopilot for alerts, weather and more",
    ctaBtn:          "Open in TripCopilot",
    footer:          "This page refreshes automatically every 2 minutes.",
    sharedWith:      "Shared with",
    socialProof:     (n: number) => `${n.toLocaleString("en-US")}+ travelers use TripCopilot`,
    timeline:        "Itinerary",
    totalDays:       (n: number) => `${n} ${n === 1 ? "day" : "days"}`,
    destinations:    (n: number) => `${n} ${n === 1 ? "destination" : "destinations"}`,
    checkIn:         "Check-in",
    checkOut:        "Check-out",
  },
} as const;

type Locale = "es" | "en";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("es-AR", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function formatDateLocale(isoDate: string, locale: Locale): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString(
    locale === "en" ? "en-US" : "es-AR",
    { weekday: "short", day: "numeric", month: "short" },
  );
}

function formatDateRange(flights: SharedTripFlight[]): string {
  if (flights.length === 0) return "";
  const first = flights[0].iso_date;
  const last  = flights[flights.length - 1].iso_date;
  if (first === last) return formatDate(first);
  return `${formatDate(first)} – ${formatDate(last)}`;
}

function buildRouteString(flights: SharedTripFlight[]): string {
  if (flights.length === 0) return "";
  const codes = [flights[0].origin_code];
  for (const f of flights) codes.push(f.destination_code);
  const deduped: string[] = [codes[0]];
  for (let i = 1; i < codes.length; i++) {
    if (codes[i] !== codes[i - 1]) deduped.push(codes[i]);
  }
  return deduped.join(" → ");
}

function flightDaysLeft(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(isoDate + "T00:00:00").getTime() - today.getTime()) / 86400000);
}

function flightStatusBadge(
  isoDate: string,
  L: (typeof LABELS)[Locale],
): { label: string; cls: string } {
  const diff = flightDaysLeft(isoDate);
  if (diff < 0)   return { label: L.completed,          cls: "bg-gray-800/70 text-gray-400 border-gray-700/40" };
  if (diff === 0) return { label: L.today,               cls: "bg-blue-900/60 text-blue-300 border-blue-700/40" };
  if (diff === 1) return { label: L.tomorrow,            cls: "bg-emerald-900/50 text-emerald-300 border-emerald-700/40" };
  if (diff <= 3)  return { label: L.inDays(diff),        cls: "bg-amber-900/40 text-amber-300 border-amber-700/40" };
  return { label: L.inDays(diff), cls: "bg-white/5 text-gray-400 border-white/8" };
}

/** Compute trip stats. */
function tripStats(flights: SharedTripFlight[]) {
  if (flights.length === 0) return { totalDays: 0, destinations: 0 };

  const first = new Date(flights[0].iso_date + "T00:00:00");
  const lastDate = flights[flights.length - 1].arrival_date ?? flights[flights.length - 1].iso_date;
  const last  = new Date(lastDate + "T00:00:00");
  const totalDays = Math.max(1, Math.round((last.getTime() - first.getTime()) / 86400000) + 1);

  const destSet = new Set(flights.map((f) => f.destination_code));
  return { totalDays, destinations: destSet.size };
}

// ── SVG Route Arc ─────────────────────────────────────────────────────────────

function RouteArcSvg({ flights }: { flights: SharedTripFlight[] }) {
  if (flights.length === 0) return null;

  const codes = [flights[0].origin_code, ...flights.map((f) => f.destination_code)];
  const unique: string[] = [codes[0]];
  for (let i = 1; i < codes.length; i++) {
    if (codes[i] !== codes[i - 1]) unique.push(codes[i]);
  }

  const airports = unique
    .map((c) => ({ code: c, info: AIRPORTS[c] }))
    .filter((a) => a.info);

  if (airports.length < 2) return null;

  const lngs = airports.map((a) => a.info!.lng);
  const lats = airports.map((a) => a.info!.lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lngRange = maxLng - minLng || 1;
  const latRange = maxLat - minLat || 1;

  const W = 280;
  const H = 70;
  const PAD = 16;

  const toSvg = (lat: number, lng: number) => ({
    x: PAD + ((lng - minLng) / lngRange) * (W - 2 * PAD),
    y: PAD + ((maxLat - lat) / latRange) * (H - 2 * PAD),
  });

  const pts = airports.map((a) => toSvg(a.info!.lat, a.info!.lng));

  // Build path: quadratic bezier segments between consecutive airports
  const segments: string[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cx = (p0.x + p1.x) / 2;
    const cy = (p0.y + p1.y) / 2 - 14;
    if (i === 0) segments.push(`M ${p0.x} ${p0.y}`);
    segments.push(`Q ${cx} ${cy} ${p1.x} ${p1.y}`);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 60 }} aria-hidden="true">
      {/* Route arc */}
      <path
        d={segments.join(" ")}
        fill="none"
        stroke="rgba(167,139,250,0.30)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />

      {/* Airport dots + labels */}
      {airports.map((a, i) => {
        const pt = pts[i];
        const isFirst = i === 0;
        const isLast  = i === airports.length - 1;
        return (
          <g key={a.code}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={isFirst || isLast ? 4 : 3}
              fill={isFirst || isLast ? "#6d28d9" : "rgba(109,40,217,0.5)"}
            />
            <text
              x={pt.x}
              y={pt.y + 13}
              textAnchor="middle"
              fontSize={8}
              fill="rgba(156,163,175,0.85)"
              fontFamily="monospace"
            >
              {a.code}
            </text>
          </g>
        );
      })}

      {/* Plane at midpoint */}
      {pts.length >= 2 && (() => {
        const mid = Math.floor((pts.length - 1) / 2);
        const p0 = pts[mid];
        const p1 = pts[mid + 1];
        const mx = (p0.x + p1.x) / 2;
        const my = (p0.y + p1.y) / 2 - 14;
        return (
          <text x={mx} y={my + 4} textAnchor="middle" fontSize={10} fill="rgba(167,139,250,0.90)">
            ✈
          </text>
        );
      })()}
    </svg>
  );
}

// ── Flight card ───────────────────────────────────────────────────────────────

function FlightCard({
  flight,
  index,
  acc,
  L,
  locale,
}: {
  flight: SharedTripFlight;
  index: number;
  acc: SharedTripAccommodation | undefined;
  L: (typeof LABELS)[Locale];
  locale: Locale;
}) {
  const badge       = flightStatusBadge(flight.iso_date, L);
  const originCity  = AIRPORTS[flight.origin_code]?.city ?? flight.origin_code;
  const destCity    = AIRPORTS[flight.destination_code]?.city ?? flight.destination_code;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] overflow-hidden">
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              {L.flight(index + 1)}
            </span>
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-xl font-black tracking-wide text-white">{flight.flight_code}</p>
          <p className="text-xs text-gray-500 mt-0.5">{flight.airline_name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-white">
            {flight.origin_code}
            <span className="mx-1.5 text-gray-500">→</span>
            {flight.destination_code}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">{originCity} · {destCity}</p>
        </div>
      </div>

      {/* Date & times row */}
      <div className="px-4 pb-3 flex items-center gap-3 border-t border-white/[0.05]">
        <div className="flex-1 pt-2.5">
          <p className="text-xs font-semibold text-gray-300">{formatDateLocale(flight.iso_date, locale)}</p>
          {flight.departure_time && (
            <p className="text-xs text-gray-500 mt-0.5">
              {flight.departure_time}
              {flight.arrival_time && (
                <>
                  {" → "}{flight.arrival_time}
                  {flight.arrival_date && flight.arrival_date !== flight.iso_date && (
                    <span className="text-gray-600 text-[10px]"> +1</span>
                  )}
                </>
              )}
            </p>
          )}
        </div>
        <Plane className="h-4 w-4 text-gray-600" aria-hidden="true" />
      </div>

      {/* Accommodation below flight */}
      {acc && (
        <div className="px-4 py-2.5 border-t border-white/[0.05] bg-white/[0.02] flex items-center gap-2.5">
          <span className="text-sm shrink-0" aria-hidden="true">🏨</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-200 truncate">{acc.name}</p>
            <p className="text-[11px] text-gray-500">
              {acc.check_in_date ? formatDateLocale(acc.check_in_date, locale) : ""}
              {acc.check_out_date ? ` – ${formatDateLocale(acc.check_out_date, locale)}` : ""}
              {acc.check_in_time ? ` · ${L.checkIn} ${acc.check_in_time}` : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Trip timeline preview ─────────────────────────────────────────────────────

function TripTimeline({
  flights,
  L,
  locale,
}: {
  flights: SharedTripFlight[];
  L: (typeof LABELS)[Locale];
  locale: Locale;
}) {
  if (flights.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-white/[0.05]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
          <MapPin className="h-3 w-3" aria-hidden="true" />
          {L.timeline}
        </p>
      </div>

      {/* SVG route arc */}
      <div className="px-3 pt-2 pb-1">
        <RouteArcSvg flights={flights} />
      </div>

      {/* Timeline stops */}
      <div className="px-4 pb-3 space-y-0">
        {flights.map((f, i) => {
          const isLast = i === flights.length - 1;
          const originCity = AIRPORTS[f.origin_code]?.city ?? f.origin_code;
          const destCity   = AIRPORTS[f.destination_code]?.city ?? f.destination_code;
          return (
            <div key={f.id} className="relative">
              {/* Connector line */}
              {!isLast && (
                <div className="absolute left-[7px] top-5 bottom-0 w-px bg-white/[0.07]" />
              )}
              <div className="flex items-start gap-3 py-1.5">
                <div className="h-3.5 w-3.5 rounded-full border border-[rgba(255,184,0,0.25)] bg-[rgba(255,184,0,0.06)] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">
                    {originCity}
                    <span className="text-gray-500 mx-1.5">→</span>
                    {destCity}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {f.flight_code} · {formatDateLocale(f.iso_date, locale)}
                    {f.departure_time && ` · ${f.departure_time}`}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ShareTripPage({ params }: PageProps) {
  const { token } = await params;
  const trip = await getTripByShareToken(token);

  if (!trip) notFound();

  // Detect locale from Accept-Language header
  const headersList = await headers();
  const acceptLang = headersList.get("accept-language") ?? "";
  const locale: Locale = acceptLang.toLowerCase().startsWith("es") ? "es" : "en";
  const L = LABELS[locale];

  const sortedFlights = [...trip.flights].sort((a, b) => {
    const d = a.iso_date.localeCompare(b.iso_date);
    return d !== 0 ? d : (a.departure_time ?? "").localeCompare(b.departure_time ?? "");
  });

  const routeStr  = buildRouteString(sortedFlights);
  const dateRange = formatDateRange(sortedFlights);
  const stats     = tripStats(sortedFlights);

  // Hero city: destination of last flight
  const lastFlight  = sortedFlights[sortedFlights.length - 1];
  const heroCode    = lastFlight?.destination_code ?? "";
  const heroCity    = AIRPORTS[heroCode]?.city ?? heroCode;
  const flightCount = sortedFlights.length;

  // Social proof count (static, representative)
  const TRAVELER_COUNT = 12_400;

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <AutoRefresh />

      {/* Animated plane (CSS, subtle) */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-px overflow-hidden"
        aria-hidden="true"
      >
        <style>{`
          @keyframes fly-across {
            0%   { transform: translateX(-60px); }
            100% { transform: translateX(calc(100vw + 60px)); }
          }
          .animate-fly {
            animation: fly-across 14s linear infinite;
            will-change: transform;
          }
        `}</style>
        <div
          className="animate-fly absolute top-5 text-[rgba(255,184,0,0.60)] text-lg select-none"
        >
          ✈
        </div>
      </div>

      {/* Hero gradient */}
      <div className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-[rgba(7,7,13,0.60)] via-[#0a0a12] to-[#0a0a12]"
        />
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[rgba(255,184,0,0.12)] blur-3xl"
        />

        <div className="relative max-w-lg mx-auto px-5 pt-10 pb-8">
          {/* Live badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/50 mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400">{L.liveBadge}</span>
          </div>

          {/* Trip name */}
          <h1 className="text-3xl font-black text-white leading-tight mb-1">
            {trip.name}
          </h1>

          {/* Destination city */}
          {heroCity && (
            <p className="text-lg font-semibold text-[rgba(255,184,0,0.60)] mb-4">{heroCity}</p>
          )}

          {/* Route breadcrumb */}
          {routeStr && (
            <div className="flex items-center gap-2 mb-4">
              <Plane className="h-3.5 w-3.5 text-gray-500 shrink-0" aria-hidden="true" />
              <p className="text-sm font-mono text-gray-400">{routeStr}</p>
            </div>
          )}

          {/* Trip stats pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {flightCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.09] text-xs font-semibold text-gray-300">
                <Plane className="h-3 w-3 text-[#FFB800]" aria-hidden="true" />
                {L.flights(flightCount)}
              </span>
            )}
            {stats.totalDays > 1 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.09] text-xs font-semibold text-gray-300">
                <Calendar className="h-3 w-3 text-blue-400" aria-hidden="true" />
                {L.totalDays(stats.totalDays)}
              </span>
            )}
            {stats.destinations > 1 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.09] text-xs font-semibold text-gray-300">
                <MapPin className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                {L.destinations(stats.destinations)}
              </span>
            )}
            {trip.accommodations.length > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.09] text-xs font-semibold text-gray-300">
                🏨 {L.stays(trip.accommodations.length)}
              </span>
            )}
            {dateRange && (
              <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.09] text-xs font-semibold text-gray-300">
                {dateRange}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reactions */}
      <div className="max-w-lg mx-auto px-5 pb-2">
        <SharedTripReactions shareToken={token} />
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-5 pb-6 space-y-3">
        {/* Trip timeline preview */}
        {sortedFlights.length > 1 && (
          <TripTimeline flights={sortedFlights} L={L} locale={locale} />
        )}

        {/* Flight cards */}
        {sortedFlights.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-12">{L.noFlights}</p>
        ) : (
          sortedFlights.map((flight, idx) => {
            const acc = trip.accommodations.find(
              (a) =>
                a.check_in_date === (flight.arrival_date ?? flight.iso_date) ||
                a.check_in_date === flight.iso_date,
            );
            return (
              <FlightCard
                key={flight.id}
                flight={flight}
                index={idx}
                acc={acc}
                L={L}
                locale={locale}
              />
            );
          })
        )}

        {/* PWA install banner */}
        <InstallBanner locale={locale} />

        {/* CTA */}
        <div className="rounded-2xl border border-[rgba(255,184,0,0.25)] bg-gradient-to-br from-[rgba(7,7,13,0.60)] to-transparent px-5 py-6 text-center space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[rgba(255,184,0,0.60)]">
            {L.ctaLabel}
          </p>
          <p className="text-base font-bold text-white">{L.ctaBody}</p>
          <Link
            href="/app"
            className="inline-block rounded-xl bg-[#FFB800] hover:bg-[#FFC933] active:bg-[#E6A500] transition-colors px-6 py-2.5 text-sm font-bold text-[#07070d] shadow-lg shadow-[rgba(255,184,0,0.20)]"
          >
            {L.ctaBtn}
          </Link>
        </div>

        {/* Social proof */}
        <div className="text-center py-1">
          <p className="text-xs font-semibold text-gray-500">
            {L.socialProof(TRAVELER_COUNT)}
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-gray-600 pt-1 pb-2">
          {L.footer}
          <br />
          <span className="text-gray-700">{L.sharedWith}</span>{" "}
          <span className="font-semibold text-gray-500">TripCopilot</span>
        </p>
      </div>
    </div>
  );
}
