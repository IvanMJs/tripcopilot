/**
 * Returns the local date string (YYYY-MM-DD) for a given UTC moment
 * in a specific IANA timezone. Use this instead of .toISOString().slice(0,10)
 * whenever you need the date as seen by a user in a given timezone.
 *
 * Example: dateInTimezone(now, "America/New_York") → "2026-04-05" at 23:00 UTC
 *   while  now.toISOString().slice(0,10)           → "2026-04-06"
 */
export function dateInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year:  "numeric",
    month: "2-digit",
    day:   "2-digit",
  }).format(date);
}

/**
 * Given a local date string + local time string + IANA timezone,
 * returns the equivalent UTC Date. Handles DST correctly via Intl.
 *
 * Example: localToUTC("2026-05-10", "14:30", "America/Chicago") → Date (UTC)
 */
export function localToUTC(isoDate: string, localTime: string, timezone: string): Date {
  // Build a Date treating the values as if they were UTC (no offset)
  const guessUTC = new Date(`${isoDate}T${localTime}:00Z`);

  // Find what clock time that UTC moment shows in the target timezone
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year:   "numeric",
    month:  "2-digit",
    day:    "2-digit",
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(guessUTC).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});

  // The difference between what we said (localTime) and what the timezone
  // shows is the offset we need to correct by
  const tzAsUTC = new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`,
  );
  const offsetMs = guessUTC.getTime() - tzAsUTC.getTime();

  return new Date(guessUTC.getTime() + offsetMs);
}

/**
 * Returns the current local hour (0-23) in a given IANA timezone.
 */
export function localHourInTimezone(date: Date, timezone: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour:   "2-digit",
    hour12: false,
  });
  return parseInt(fmt.format(date), 10);
}

/** Bilingual notification labels for the cron */
export const CRON_LABELS = {
  es: {
    statusLabel: {
      ok:               "Normal ✅",
      delay_minor:      "Demora leve 🟡",
      delay_moderate:   "Demora moderada 🟠",
      delay_severe:     "Demora severa 🔴",
      ground_delay:     "Ground delay 🔴",
      ground_stop:      "Ground stop 🛑",
      closure:          "Cerrado ⛔",
    } as Record<string, string>,
    delayAlert: (origin: string, code: string, dest: string, date: string, label: string) =>
      ({ title: `Alerta en ${origin} — ${code}`, body: `Tu vuelo ${code} a ${dest} el ${date}. Estado de ${origin}: ${label}.` }),
    morningBriefing: (code: string, time: string, origin: string, dest: string, label: string) =>
      ({ title: `¡Hoy viajás! ${code} sale a las ${time}`, body: `${origin}→${dest}. ${origin}: ${label}. ¡Buen vuelo! 🛫` }),
    checkin24h: (code: string, origin: string, dest: string, time: string) =>
      ({ title: "¿Hiciste el check-in? ✈️", body: `Tu vuelo ${code} ${origin}→${dest} sale mañana a las ${time}.` }),
    preflight3h: (code: string, origin: string, dest: string, time: string, label: string) =>
      ({ title: `Tu vuelo ${code} sale en ~3hs`, body: `${origin}→${dest} a las ${time}. ${origin}: ${label}.` }),
    flightCancelled: (code: string, origin: string, dest: string) =>
      ({ title: `Vuelo cancelado ⛔ — ${code}`, body: `Tu vuelo ${code} ${origin}→${dest} fue cancelado. Contactá a la aerolínea.` }),
    flightDelay: (code: string, delayText: string, estimatedDep: string | null, time: string, gateText: string, origin: string, dest: string, delayMins?: number) =>
      ({ title: `${code} con ${delayText} de demora 🟠`, body: `Nueva hora: ${estimatedDep ?? time}${delayMins != null ? ` (+${delayMins} min)` : ""}${gateText} · ${origin}→${dest}.` }),
    flightLanded: (code: string, origin: string, dest: string) =>
      ({ title: `✅ ${code} aterrizó`, body: `${origin} → ${dest} · Buen viaje` }),
    boardingOpen: (code: string, origin: string, dest: string, gateText: string) =>
      ({ title: `🚪 Boarding abierto — ${code}`, body: `Dirigite a tu puerta${gateText} · ${origin} → ${dest}` }),
    hotelCheckinReminder: (name: string) =>
      ({ title: `🏨 Mañana check-in en ${name}`, body: "Recordá tener listos los documentos y código de reserva." }),
    hotelCheckinTime: (name: string, time: string) =>
      ({ title: `🏨 Check-in ahora — ${name}`, body: `Hora de check-in: ${time}. ¡Bienvenido!` }),
    hotelCheckoutReminder: (name: string) =>
      ({ title: `🏨 Mañana check-out en ${name}`, body: "Recordá dejar la habitación a tiempo y tener listo el equipaje." }),
    hotelCheckoutTime: (name: string, time: string) =>
      ({ title: `🏨 Check-out ahora — ${name}`, body: `Hora de check-out: ${time}. ¡Buen viaje!` }),
    gateChange: (code: string, newGate: string, oldGate: string | null, origin: string, dest: string) =>
      ({ title: `🚪 Cambio de puerta · ${code}`, body: `Nueva puerta: ${newGate} · ${origin}→${dest}${oldGate !== null ? ` (antes ${oldGate})` : ""}` }),
    anniversary: (years: number, city: string) =>
      ({ title: `Hoy hace ${years} año${years !== 1 ? "s" : ""} llegaste a ${city} ✈️`, body: `¿Lo recordás?` }),
    weeklyStats: {
      noTrips: { title: "¿Cuándo es tu próxima aventura? ✈️", body: "Planificá tu próximo viaje en TripCopilot" },
      upcoming: (dest: string, days: number) => ({
        title: `Tu próximo viaje a ${dest} en ${days} día${days !== 1 ? "s" : ""} ✈️`,
        body: "TripCopilot te tiene cubierto",
      }),
    },
    dejaVu: (city: string, monthsAgo: number, tempC: number | null) => ({
      title: `¡Bienvenido de vuelta a ${city}! 🧠`,
      body: `Ya estuviste acá hace ${monthsAgo} mes${monthsAgo !== 1 ? "es" : ""}${tempC !== null ? `. ${tempC}°C ahora` : ""}`,
    }),
    airplaneBrief: (aircraftType: string, brief: string) => ({
      title: `Tu avión de mañana: ${aircraftType} ✈️`,
      body: brief,
    }),
    ground_segment_today: (f: { originCode: string; destinationCode: string; departureTime: string | null; segmentType: string }) => {
      const bufferMap: Record<string, number> = { bus: 30, train: 15, ferry: 45, car_rental: 20, transfer: 20 };
      const buffer = bufferMap[f.segmentType] ?? 20;
      const titleMap: Record<string, string> = {
        bus:        `Hoy tenés bus a ${f.destinationCode} 🚌`,
        train:      `Hoy tenés tren a ${f.destinationCode} 🚂`,
        ferry:      `Hoy tenés ferry a ${f.destinationCode} ⛴️`,
        car_rental: `Hoy retirás el auto 🚗`,
        transfer:   `Hoy tenés transfer a ${f.destinationCode} 🚐`,
      };
      const title = titleMap[f.segmentType] ?? `Hoy salís a ${f.destinationCode}`;
      const body = f.departureTime
        ? `Salís a las ${f.departureTime} desde ${f.originCode} · Llegá ${buffer} min antes`
        : `Desde ${f.originCode} · Llegá ${buffer} min antes`;
      return { title, body, tag: `ground_today_${f.originCode}_${f.destinationCode}`, url: "/trips" };
    },
  },
  en: {
    statusLabel: {
      ok:               "Normal ✅",
      delay_minor:      "Minor delay 🟡",
      delay_moderate:   "Moderate delay 🟠",
      delay_severe:     "Severe delay 🔴",
      ground_delay:     "Ground delay 🔴",
      ground_stop:      "Ground stop 🛑",
      closure:          "Closed ⛔",
    } as Record<string, string>,
    delayAlert: (origin: string, code: string, dest: string, date: string, label: string) =>
      ({ title: `Alert at ${origin} — ${code}`, body: `Your flight ${code} to ${dest} on ${date}. ${origin} status: ${label}.` }),
    morningBriefing: (code: string, time: string, origin: string, dest: string, label: string) =>
      ({ title: `Travel day! ${code} departs at ${time}`, body: `${origin}→${dest}. ${origin}: ${label}. Have a great flight! 🛫` }),
    checkin24h: (code: string, origin: string, dest: string, time: string) =>
      ({ title: "Did you check in? ✈️", body: `Your flight ${code} ${origin}→${dest} departs tomorrow at ${time}.` }),
    preflight3h: (code: string, origin: string, dest: string, time: string, label: string) =>
      ({ title: `Your flight ${code} departs in ~3h`, body: `${origin}→${dest} at ${time}. ${origin}: ${label}.` }),
    flightCancelled: (code: string, origin: string, dest: string) =>
      ({ title: `Flight cancelled ⛔ — ${code}`, body: `Your flight ${code} ${origin}→${dest} was cancelled. Contact the airline.` }),
    flightDelay: (code: string, delayText: string, estimatedDep: string | null, time: string, gateText: string, origin: string, dest: string, delayMins?: number) =>
      ({ title: `${code} delayed by ${delayText} 🟠`, body: `New time: ${estimatedDep ?? time}${delayMins != null ? ` (+${delayMins} min)` : ""}${gateText} · ${origin}→${dest}.` }),
    flightLanded: (code: string, origin: string, dest: string) =>
      ({ title: `✅ ${code} landed`, body: `${origin} → ${dest} · Safe travels` }),
    boardingOpen: (code: string, origin: string, dest: string, gateText: string) =>
      ({ title: `🚪 Boarding open — ${code}`, body: `Head to your gate${gateText} · ${origin} → ${dest}` }),
    hotelCheckinReminder: (name: string) =>
      ({ title: `🏨 Check-in tomorrow at ${name}`, body: "Remember to have your documents and booking code ready." }),
    hotelCheckinTime: (name: string, time: string) =>
      ({ title: `🏨 Check-in now — ${name}`, body: `Check-in time: ${time}. Welcome!` }),
    hotelCheckoutReminder: (name: string) =>
      ({ title: `🏨 Check-out tomorrow at ${name}`, body: "Remember to vacate on time and have your luggage ready." }),
    hotelCheckoutTime: (name: string, time: string) =>
      ({ title: `🏨 Check-out now — ${name}`, body: `Check-out time: ${time}. Safe travels!` }),
    gateChange: (code: string, newGate: string, oldGate: string | null, origin: string, dest: string) =>
      ({ title: `🚪 Gate change · ${code}`, body: `New gate: ${newGate} · ${origin}→${dest}${oldGate !== null ? ` (was ${oldGate})` : ""}` }),
    anniversary: (years: number, city: string) =>
      ({ title: `${years} year${years !== 1 ? "s" : ""} ago today you landed in ${city} ✈️`, body: `Remember that trip?` }),
    weeklyStats: {
      noTrips: { title: "When's your next adventure? ✈️", body: "Plan your next trip in TripCopilot" },
      upcoming: (dest: string, days: number) => ({
        title: `Your next trip to ${dest} in ${days} day${days !== 1 ? "s" : ""} ✈️`,
        body: "TripCopilot has you covered",
      }),
    },
    dejaVu: (city: string, monthsAgo: number, tempC: number | null) => ({
      title: `Welcome back to ${city}! 🧠`,
      body: `You visited ${monthsAgo} month${monthsAgo !== 1 ? "s" : ""} ago${tempC !== null ? `. ${tempC}°C now` : ""}`,
    }),
    airplaneBrief: (aircraftType: string, brief: string) => ({
      title: `Tomorrow's aircraft: ${aircraftType} ✈️`,
      body: brief,
    }),
    ground_segment_today: (f: { originCode: string; destinationCode: string; departureTime: string | null; segmentType: string }) => {
      const bufferMap: Record<string, number> = { bus: 30, train: 15, ferry: 45, car_rental: 20, transfer: 20 };
      const buffer = bufferMap[f.segmentType] ?? 20;
      const titleMap: Record<string, string> = {
        bus:        `Bus to ${f.destinationCode} today 🚌`,
        train:      `Train to ${f.destinationCode} today 🚂`,
        ferry:      `Ferry to ${f.destinationCode} today ⛴️`,
        car_rental: `Car rental pickup today 🚗`,
        transfer:   `Transfer to ${f.destinationCode} today 🚐`,
      };
      const title = titleMap[f.segmentType] ?? `Departing to ${f.destinationCode} today`;
      const body = f.departureTime
        ? `Departs at ${f.departureTime} from ${f.originCode} · Arrive ${buffer} min early`
        : `From ${f.originCode} · Arrive ${buffer} min early`;
      return { title, body, tag: `ground_today_${f.originCode}_${f.destinationCode}`, url: "/trips" };
    },
  },
} as const;

export type CronLocale = keyof typeof CRON_LABELS;
