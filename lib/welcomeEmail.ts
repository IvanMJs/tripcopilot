export function buildWelcomeEmail(name: string): string {
  const features = [
    {
      icon: "📸",
      color: "#7c3aed",
      bg: "rgba(124,58,237,0.12)",
      title: "Importá vuelos con IA",
      desc: "Sacá una foto de tu reserva o pegá el texto — TripCopilot detecta vuelo, asiento, horario y todo lo carga solo.",
    },
    {
      icon: "🔔",
      color: "#0ea5e9",
      bg: "rgba(14,165,233,0.12)",
      title: "Alertas antes que nadie",
      desc: "Demoras, cambios de puerta, cancelaciones y actualizaciones de estado en tiempo real, directo a tu teléfono.",
    },
    {
      icon: "🌍",
      color: "#10b981",
      bg: "rgba(16,185,129,0.12)",
      title: "Tu mapa del mundo",
      desc: "Cada país que pisaste, cada aeropuerto que pasaste. Un mapa interactivo que crece con cada viaje.",
    },
    {
      icon: "✨",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.12)",
      title: "Dream Trip Planner IA",
      desc: "Contale a la IA a dónde soñás ir y te arma un itinerario completo con vuelos, actividades y presupuesto.",
    },
    {
      icon: "👫",
      color: "#ec4899",
      bg: "rgba(236,72,153,0.12)",
      title: "Red de viajeros",
      desc: "Conectate con amigos, vé en qué parte del mundo están y sumá reacciones a sus viajes.",
    },
    {
      icon: "🛫",
      color: "#8b5cf6",
      bg: "rgba(139,92,246,0.12)",
      title: "Tu avión de mañana",
      desc: "24 horas antes de cada vuelo recibís un dato curioso sobre el avión que te espera.",
    },
  ];

  const featureCards = features.map(f => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px">
      <tr>
        <td width="52" valign="top" style="padding-right:14px">
          <div style="width:44px;height:44px;background:${f.bg};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;text-align:center;line-height:44px">
            ${f.icon}
          </div>
        </td>
        <td valign="top">
          <p style="color:#f9fafb;font-size:14px;font-weight:700;margin:0 0 3px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">${f.title}</p>
          <p style="color:#9ca3af;font-size:13px;line-height:1.55;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">${f.desc}</p>
        </td>
      </tr>
    </table>
  `).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Bienvenido a TripCopilot</title>
</head>
<body style="margin:0;padding:0;background:#060610;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:0 0 40px">

    <!-- Hero -->
    <div style="background:linear-gradient(160deg,#0f0720 0%,#0a0a1a 50%,#060610 100%);padding:48px 32px 40px;text-align:center;position:relative;overflow:hidden">
      <!-- Glow effect -->
      <div style="position:absolute;top:-60px;left:50%;transform:translateX(-50%);width:300px;height:300px;background:radial-gradient(circle,rgba(124,58,237,0.25) 0%,transparent 70%);pointer-events:none"></div>

      <!-- Logo -->
      <div style="margin-bottom:20px">
        <div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:18px;padding:14px 18px;font-size:28px;line-height:1">✈️</div>
      </div>

      <h1 style="color:#ffffff;font-size:28px;font-weight:900;letter-spacing:-0.5px;margin:0 0 6px;line-height:1.2">
        TripCopilot
      </h1>
      <p style="color:#7c3aed;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0 0 28px">
        Tu copiloto de viajes con IA
      </p>

      <!-- Greeting -->
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px 28px;display:inline-block;max-width:440px;text-align:left">
        <p style="color:#ffffff;font-size:20px;font-weight:800;margin:0 0 10px">
          Hola, ${name} 👋
        </p>
        <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:0">
          Ya sos parte de TripCopilot. Cada vuelo que hagás a partir de ahora tiene un copiloto que trabaja por vos — alertas inteligentes, mapa de viajes, IA que planifica y una red de viajeros que crece.
        </p>
      </div>
    </div>

    <!-- Stats strip -->
    <div style="background:linear-gradient(90deg,rgba(124,58,237,0.15),rgba(79,70,229,0.15));border-top:1px solid rgba(124,58,237,0.2);border-bottom:1px solid rgba(124,58,237,0.2);padding:16px 32px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="text-align:center;padding:0 8px">
            <p style="color:#a78bfa;font-size:20px;font-weight:900;margin:0">IA</p>
            <p style="color:#6b7280;font-size:11px;margin:0;letter-spacing:0.5px">Escaneo de reservas</p>
          </td>
          <td style="text-align:center;padding:0 8px;border-left:1px solid rgba(255,255,255,0.06);border-right:1px solid rgba(255,255,255,0.06)">
            <p style="color:#a78bfa;font-size:20px;font-weight:900;margin:0">24/7</p>
            <p style="color:#6b7280;font-size:11px;margin:0;letter-spacing:0.5px">Monitoreo de vuelos</p>
          </td>
          <td style="text-align:center;padding:0 8px">
            <p style="color:#a78bfa;font-size:20px;font-weight:900;margin:0">∞</p>
            <p style="color:#6b7280;font-size:11px;margin:0;letter-spacing:0.5px">Países por descubrir</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- What you can do -->
    <div style="padding:32px 32px 0">
      <p style="color:#6b7280;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px">
        Todo lo que te espera
      </p>
      ${featureCards}
    </div>

    <!-- Journey vision block -->
    <div style="margin:28px 32px 0;background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(79,70,229,0.08));border:1px solid rgba(124,58,237,0.2);border-radius:16px;padding:24px">
      <p style="color:#c4b5fd;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 10px">¿Adónde querés llegar?</p>
      <p style="color:#e5e7eb;font-size:15px;line-height:1.7;margin:0 0 16px;font-weight:500">
        El primer viaje que registres abre el mapa. El segundo empieza a contar la historia. Con el tiempo, TripCopilot se convierte en el diario de todos tus viajes — desde el primer gate hasta el último aeropuerto.
      </p>
      <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0">
        Alertas personalizadas · Déjà vu en aeropuertos que ya visitaste · Stats semanales de tu actividad viajera · Planificador de sueños con IA
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;padding:32px 32px 0">
      <a href="https://tripcopilot.app/app"
         style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:15px 40px;border-radius:14px;letter-spacing:0.3px;box-shadow:0 4px 24px rgba(124,58,237,0.4)">
        ✈️ &nbsp;Abrir TripCopilot
      </a>
      <p style="color:#6b7280;font-size:12px;margin:14px 0 0">
        No necesitás contraseña · Tus datos están seguros · Siempre gratis para empezar
      </p>
    </div>

    <!-- Share nudge -->
    <div style="margin:28px 32px 0;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:14px;padding:20px 24px;text-align:center">
      <p style="color:#9ca3af;font-size:13px;margin:0 0 8px">
        ¿Tenés amigos que viajan seguido?
      </p>
      <p style="color:#e5e7eb;font-size:14px;font-weight:600;margin:0 0 14px">
        Mandales TripCopilot — podés agregar amigos desde la app y ver sus viajes en tiempo real 🌍
      </p>
      <a href="https://tripcopilot.app"
         style="display:inline-block;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);color:#a78bfa;font-size:13px;font-weight:600;text-decoration:none;padding:9px 22px;border-radius:10px">
        Compartir tripcopilot.app →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:28px 32px 0;text-align:center;border-top:1px solid rgba(255,255,255,0.04);margin-top:32px">
      <p style="color:#374151;font-size:12px;margin:0 0 6px;font-weight:600">TripCopilot</p>
      <p style="color:#374151;font-size:11px;margin:0 0 10px">Buenos Aires, Argentina</p>
      <a href="https://tripcopilot.app" style="color:#4b5563;font-size:11px;text-decoration:none">tripcopilot.app</a>
    </div>

  </div>
</body>
</html>`;
}
