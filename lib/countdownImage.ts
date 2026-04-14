// ── countdownImage.ts ─────────────────────────────────────────────────────────
// Canvas 1080×1920 countdown card generator.
// Reuses roundRect and font patterns from lib/tripCardImage.ts.

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

/**
 * Generate a 1080×1920 countdown share card.
 *
 * @param destination  Destination city name, e.g. "Barcelona"
 * @param daysLeft     Number of days until departure (must be >= 0)
 * @param departureDate  Human-readable departure date, e.g. "14 abr 2026"
 * @param route        Route string, e.g. "EZE → BCN"
 */
export async function generateCountdownImage(
  destination: string,
  daysLeft: number,
  departureDate: string,
  route: string,
): Promise<Blob> {
  const WIDTH  = 1080;
  const HEIGHT = 1920;

  const canvas = document.createElement("canvas");
  canvas.width  = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");

  // ── Background gradient (deep dark blue-violet) ──────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0,   "#0d0621");
  bg.addColorStop(0.5, "#0f1729");
  bg.addColorStop(1,   "#07070f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ── Subtle dot grid ──────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.022)";
  for (let x = 0; x < WIDTH; x += 24) {
    for (let y = 0; y < HEIGHT; y += 24) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Glow orb — center of card ────────────────────────────────────────────────
  const orb = ctx.createRadialGradient(540, 860, 0, 540, 860, 680);
  orb.addColorStop(0,   "rgba(139,92,246,0.22)");
  orb.addColorStop(1,   "rgba(139,92,246,0.00)");
  ctx.fillStyle = orb;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ── TripCopilot branding (top) ────────────────────────────────────────────────
  ctx.textAlign = "center";
  ctx.font = "bold 36px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(139,92,246,0.60)";
  ctx.fillText("TripCopilot ✈", 540, 160);

  // ── "Days until" label ────────────────────────────────────────────────────────
  ctx.font = "32px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.40)";
  ctx.fillText("DAYS UNTIL", 540, 580);

  // ── Big day number ────────────────────────────────────────────────────────────
  const dayStr = daysLeft.toString();
  const dayFontSize = dayStr.length <= 2 ? 380 : dayStr.length <= 3 ? 280 : 200;
  ctx.font = `bold ${dayFontSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(dayStr, 540, 580 + dayFontSize * 0.78);

  // ── Destination name ──────────────────────────────────────────────────────────
  ctx.font = "bold 92px system-ui, -apple-system, sans-serif";
  const destMetrics = ctx.measureText(destination);
  if (destMetrics.width > 960) {
    ctx.font = "bold 68px system-ui, -apple-system, sans-serif";
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillText(destination, 540, 1200);

  // ── Divider ───────────────────────────────────────────────────────────────────
  const divider = ctx.createLinearGradient(200, 0, 880, 0);
  divider.addColorStop(0,   "rgba(139,92,246,0.0)");
  divider.addColorStop(0.5, "rgba(139,92,246,0.5)");
  divider.addColorStop(1,   "rgba(139,92,246,0.0)");
  ctx.fillStyle = divider;
  ctx.fillRect(200, 1240, 680, 2);

  // ── Route pill ────────────────────────────────────────────────────────────────
  const pillX = 140;
  const pillY = 1280;
  const pillW = 800;
  const pillH = 110;

  ctx.fillStyle = "rgba(139,92,246,0.14)";
  roundRect(ctx, pillX, pillY, pillW, pillH, 28);
  ctx.fill();
  ctx.strokeStyle = "rgba(139,92,246,0.32)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, pillX, pillY, pillW, pillH, 28);
  ctx.stroke();

  ctx.font = "bold 48px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ffffff";
  const routeMetrics = ctx.measureText(route);
  if (routeMetrics.width > 740) {
    ctx.font = "bold 36px system-ui, -apple-system, sans-serif";
  }
  ctx.fillText(route, 540, pillY + pillH / 2 + 17);

  // ── Departure date ────────────────────────────────────────────────────────────
  ctx.font = "28px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.40)";
  ctx.fillText(departureDate, 540, 1440);

  // ── Footer branding ───────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(139,92,246,0.35)";
  ctx.fillRect(200, 1780, 680, 1);

  ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.40)";
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
