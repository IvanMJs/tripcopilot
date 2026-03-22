/**
 * formatDate.ts — date formatting utilities for TripCopilot
 */

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
