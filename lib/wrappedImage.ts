export interface WrappedData {
  totalFlights: number;
  totalKm: number;
  countries: number;
  destinations: number;
  airborneHours: number;
  favoriteRoute?: string;
}

export async function generateWrappedImage(data: WrappedData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920; // Instagram story ratio (9:16)
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context not available");
  }

  // Background gradient (dark violet → navy)
  const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
  gradient.addColorStop(0, "#1a0535");
  gradient.addColorStop(0.5, "#0f1729");
  gradient.addColorStop(1, "#0a0a1a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  // Subtle dot pattern
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let x = 0; x < 1080; x += 24) {
    for (let y = 0; y < 1920; y += 24) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 64px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Mi Travel Wrapped", 540, 280);

  // Divider line
  ctx.fillStyle = "rgba(139, 92, 246, 0.3)";
  ctx.fillRect(340, 320, 400, 2);

  // Stats — large numbers
  const stats: { value: string; label: string; y: number; emoji: string }[] = [
    { value: data.totalFlights.toString(), label: "Vuelos", y: 500, emoji: "✈️" },
    { value: `${data.totalKm.toLocaleString()} km`, label: "Kilómetros volados", y: 720, emoji: "🌍" },
    { value: data.countries.toString(), label: "Países visitados", y: 940, emoji: "🏳️" },
    { value: data.destinations.toString(), label: "Destinos únicos", y: 1160, emoji: "📍" },
  ];

  for (const stat of stats) {
    // Emoji
    ctx.font = "48px system-ui";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(stat.emoji, 540, stat.y - 40);

    // Number
    ctx.font = "bold 80px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(stat.value, 540, stat.y + 40);

    // Label
    ctx.font = "24px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(stat.label, 540, stat.y + 80);
  }

  // Airborne hours
  if (data.airborneHours > 0) {
    ctx.font = "24px system-ui";
    ctx.fillStyle = "rgba(139, 92, 246, 0.8)";
    ctx.fillText(`${Math.round(data.airborneHours)}h en el aire`, 540, 1400);
  }

  // Favorite route
  if (data.favoriteRoute) {
    ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillText(data.favoriteRoute, 540, 1460);
  }

  // Branding
  ctx.font = "bold 32px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText("TripCopilot ✈️", 540, 1700);

  ctx.font = "20px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillText("tripcopilot.app", 540, 1750);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("canvas.toBlob returned null"));
      }
    }, "image/png");
  });
}
