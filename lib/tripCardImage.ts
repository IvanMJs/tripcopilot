import { TripFlight } from "@/lib/types";
import { AIRPORTS } from "@/lib/airports";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TripCardImageOptions {
  tripName: string;
  flights: TripFlight[];
  locale: "es" | "en";
  /** Optional weather at the final destination, if available */
  weatherEmoji?: string;
  weatherTempC?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cityName(iata: string): string {
  return AIRPORTS[iata]?.city ?? iata;
}

function buildRouteString(flights: TripFlight[]): string {
  if (flights.length === 0) return "";
  const codes: string[] = [flights[0].originCode];
  for (const f of flights) {
    codes.push(f.destinationCode);
  }
  // Deduplicate consecutive segments
  const deduped: string[] = [codes[0]];
  for (let i = 1; i < codes.length; i++) {
    if (codes[i] !== codes[i - 1]) deduped.push(codes[i]);
  }
  return deduped.join(" ✈ ");
}

function buildDateRange(flights: TripFlight[], locale: "es" | "en"): string {
  if (flights.length === 0) return "";
  const sorted = [...flights].sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  const first = sorted[0].isoDate;
  const last  = sorted[sorted.length - 1].isoDate;

  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString(
      locale === "en" ? "en-US" : "es-AR",
      { day: "numeric", month: "short", year: "numeric" },
    );

  if (first === last) return fmt(first);
  return `${fmt(first)} – ${fmt(last)}`;
}

function buildCountdown(firstFlightIso: string, locale: "es" | "en"): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const flight = new Date(firstFlightIso + "T00:00:00");
  const diffDays = Math.round((flight.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return locale === "es" ? "¡Hoy!" : "Today!";
  if (diffDays === 1) return locale === "es" ? "¡Mañana!" : "Tomorrow!";
  return locale === "es" ? `En ${diffDays} días` : `In ${diffDays} days`;
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Main generator ────────────────────────────────────────────────────────────

export async function generateTripCardImage(opts: TripCardImageOptions): Promise<Blob> {
  const { tripName, flights, locale, weatherEmoji, weatherTempC } = opts;

  const WIDTH  = 1080;
  const HEIGHT = 1920;

  const canvas = document.createElement("canvas");
  canvas.width  = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");

  // ── Background gradient (violet → navy, matching wrappedImage) ──────────────
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0,   "#1a0535");
  bg.addColorStop(0.5, "#0f1729");
  bg.addColorStop(1,   "#0a0a1a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ── Subtle dot pattern ──────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  for (let x = 0; x < WIDTH; x += 24) {
    for (let y = 0; y < HEIGHT; y += 24) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Glow orb (top center) ───────────────────────────────────────────────────
  const orb = ctx.createRadialGradient(540, 300, 0, 540, 300, 500);
  orb.addColorStop(0,   "rgba(139,92,246,0.20)");
  orb.addColorStop(1,   "rgba(139,92,246,0.00)");
  ctx.fillStyle = orb;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ── Destination city ────────────────────────────────────────────────────────
  const sorted = [...flights].sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  const destCode = sorted.length > 0 ? (sorted[sorted.length - 1].destinationCode) : "";
  const destCity = destCode ? cityName(destCode) : tripName;

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(139,92,246,0.55)";
  ctx.font = "bold 36px system-ui, -apple-system, sans-serif";
  ctx.fillText("TripCopilot ✈", 540, 200);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 120px system-ui, -apple-system, sans-serif";
  // Scale down if city name is long
  const cityMetrics = ctx.measureText(destCity);
  if (cityMetrics.width > 980) {
    ctx.font = "bold 80px system-ui, -apple-system, sans-serif";
  }
  ctx.fillText(destCity, 540, 380);

  // ── Divider ─────────────────────────────────────────────────────────────────
  const divider = ctx.createLinearGradient(200, 0, 880, 0);
  divider.addColorStop(0,   "rgba(139,92,246,0.0)");
  divider.addColorStop(0.5, "rgba(139,92,246,0.5)");
  divider.addColorStop(1,   "rgba(139,92,246,0.0)");
  ctx.fillStyle = divider;
  ctx.fillRect(200, 420, 680, 2);

  // ── Trip name ───────────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "28px system-ui, -apple-system, sans-serif";
  ctx.fillText(tripName, 540, 478);

  // ── Countdown ──────────────────────────────────────────────────────────────
  const firstIso  = sorted[0]?.isoDate ?? new Date().toISOString().slice(0, 10);
  const countdown = buildCountdown(firstIso, locale);

  ctx.fillStyle = "rgba(139,92,246,0.9)";
  ctx.font = "bold 72px system-ui, -apple-system, sans-serif";
  ctx.fillText(countdown, 540, 620);

  // ── Route card ──────────────────────────────────────────────────────────────
  const routeStr = buildRouteString(sorted);
  const cardX = 80;
  const cardY = 700;
  const cardW = 920;
  const cardH = 160;

  ctx.fillStyle = "rgba(139,92,246,0.12)";
  roundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(139,92,246,0.30)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px system-ui, -apple-system, sans-serif";
  const routeMetrics = ctx.measureText(routeStr);
  if (routeMetrics.width > 860) {
    ctx.font = "bold 34px system-ui, -apple-system, sans-serif";
  }
  ctx.fillText(routeStr, 540, cardY + cardH / 2 + 18);

  // ── Stats row ───────────────────────────────────────────────────────────────
  const statsY = 940;
  const statItems: { emoji: string; value: string; label: string }[] = [
    {
      emoji: "✈️",
      value: flights.length.toString(),
      label: locale === "es"
        ? `vuelo${flights.length !== 1 ? "s" : ""}`
        : `flight${flights.length !== 1 ? "s" : ""}`,
    },
    {
      emoji: "📅",
      value: buildDateRange(sorted, locale),
      label: "",
    },
  ];

  if (weatherEmoji !== undefined && weatherTempC !== undefined) {
    statItems.push({
      emoji: weatherEmoji,
      value: `${weatherTempC}°C`,
      label: locale === "es" ? "en destino" : "at destination",
    });
  }

  const colW = Math.floor(WIDTH / statItems.length);
  for (let i = 0; i < statItems.length; i++) {
    const item = statItems[i];
    const cx = colW * i + colW / 2;

    ctx.font = "52px system-ui";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(item.emoji, cx, statsY);

    ctx.font = "bold 38px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(item.value, cx, statsY + 62);

    if (item.label) {
      ctx.font = "24px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fillText(item.label, cx, statsY + 102);
    }
  }

  // ── Horizontal rule ─────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(80, 1110, 920, 1);

  // ── Flight list ─────────────────────────────────────────────────────────────
  let listY = 1180;
  const maxFlights = Math.min(sorted.length, 5);
  for (let i = 0; i < maxFlights; i++) {
    const f = sorted[i];
    const orig = f.originCode;
    const dest = f.destinationCode;
    const depDate = new Date(f.isoDate + "T00:00:00").toLocaleDateString(
      locale === "en" ? "en-US" : "es-AR",
      { day: "numeric", month: "short" },
    );

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, 80, listY, 920, 90, 14);
    ctx.fill();

    // Flight code
    ctx.textAlign = "left";
    ctx.font = "bold 30px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(139,92,246,0.90)";
    ctx.fillText(f.flightCode, 120, listY + 52);

    // Route
    ctx.font = "28px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${orig} → ${dest}`, 280, listY + 52);

    // Date + time
    ctx.textAlign = "right";
    ctx.font = "26px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(
      f.departureTime ? `${depDate} · ${f.departureTime}` : depDate,
      960,
      listY + 52,
    );
    ctx.textAlign = "center";

    listY += 110;
  }

  if (sorted.length > 5) {
    ctx.font = "24px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.30)";
    ctx.fillText(
      locale === "es"
        ? `+ ${sorted.length - 5} vuelos más`
        : `+ ${sorted.length - 5} more flights`,
      540,
      listY + 20,
    );
  }

  // ── Branding footer ─────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(139,92,246,0.40)";
  ctx.fillRect(200, 1780, 680, 1);

  ctx.font = "bold 36px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText("TripCopilot ✈️", 540, 1840);

  ctx.font = "22px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillText("tripcopilot.app", 540, 1880);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("canvas.toBlob returned null"));
    }, "image/png");
  });
}
