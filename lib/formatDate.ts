/**
 * formatDate.ts — date formatting utilities for TripCopilot
 */

/**
 * Formats an ISO date string as a full timeline section header.
 * ES: "DOMINGO 29 DE MARZO" | EN: "SUNDAY, MARCH 29"
 */
export function formatTimelineDate(isoDate: string, locale: "es" | "en"): string {
  const d = new Date(isoDate + "T12:00:00");
  if (locale === "es") {
    const weekday = new Intl.DateTimeFormat("es-AR", { weekday: "long" }).format(d);
    const day = d.getDate();
    const month = new Intl.DateTimeFormat("es-AR", { month: "long" }).format(d);
    return `${weekday.toUpperCase()} ${day} DE ${month.toUpperCase()}`;
  }
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(d);
  const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(d);
  const day = d.getDate();
  return `${weekday.toUpperCase()}, ${month.toUpperCase()} ${day}`;
}

/**
 * Formats an ISO date string (YYYY-MM-DD) as a relative label.
 * Returns "Hoy" / "Today", "Mañana" / "Tomorrow", "Pasado mañana" / "Day after tomorrow",
 * "Ayer" / "Yesterday", or a localized short date.
 */
export function formatRelativeDate(isoDate: string, locale: "es" | "en"): string {
  const now = new Date();
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(isoDate + "T12:00:00");
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0)  return locale === "es" ? "Hoy"           : "Today";
  if (diffDays === 1)  return locale === "es" ? "Mañana"        : "Tomorrow";
  if (diffDays === 2)  return locale === "es" ? "Pasado mañana" : "Day after tomorrow";
  if (diffDays === -1) return locale === "es" ? "Ayer"          : "Yesterday";

  return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(target);
}
