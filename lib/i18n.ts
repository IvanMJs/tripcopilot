export type Locale = "es" | "en";

export const translations = {
  es: {
    // Header
    appTitle: "Airport Monitor",
    appSubtitle: "Estado en tiempo real · FAA ASWS API",
    autoRefresh: "Auto-refresh:",
    updating: "Actualizando...",
    update: "Actualizar",
    nextRefresh: "Próximo en",

    // Global status bar
    noDelays: "Sin demoras activas en aeropuertos monitoreados",
    airportsWithIssues: (n: number) =>
      `${n} aeropuerto${n > 1 ? "s" : ""} con problemas:`,

    // Tabs
    tabAirports: "✈ Mis aeropuertos",
    tabFlights: "🗓 Mis vuelos",
    tabSearch: "🔍 Buscar vuelo",
    tabHelp: "❓ Ayuda",

    // Airport card
    noDelaysReported: "Sin demoras reportadas",
    delay: "Demora",
    cause: "Causa",
    affects: "Afecta",
    departures: "Salidas",
    arrivals: "Llegadas",
    groundStop: "Parada en Tierra",
    until: "hasta",
    indefinite: "tiempo indefinido",
    groundDelayProgram: "Programa de Demoras en Tierra",
    average: "Promedio",
    max: "Máx",
    airportClosed: "Aeropuerto Cerrado",
    updated: "Actualizado",
    trend: "Tendencia",

    // Airport search
    addAirport: "Agregar aeropuerto",
    searchPlaceholder: "Buscar por código, ciudad...",
    noResults: "Sin resultados",

    // Status badge labels
    statusOk: "Normal",
    statusMinor: "Demora leve",
    statusModerate: "Demora moderada",
    statusSevere: "Demora severa",
    statusGroundDelay: "Demora en Tierra",
    statusGroundStop: "Parada en Tierra",
    statusClosure: "CERRADO",
    statusUnknown: "Desconocido",

    // Legend
    legendTitle: "",
    legend: [
      "🟢 Normal",
      "🟡 ≤15 min",
      "🟠 16–45 min",
      "🔴 >45 min",
      "🔴 Demora en Tierra",
      "🛑 Parada en Tierra",
      "⛔ Cerrado",
    ],

    // Error
    errorFAA: "Error al consultar FAA:",

    // Flights panel
    trip: "EZE → MIA → GCM → JFK → MIA → EZE · 29 Mar – 12 Abr 2026",
    faaButton: "Estado de demoras en tiempo real — FAA NAS Status",
    sectionAirport: "Aeropuerto de salida",
    seeAllFlightsFrom: (code: string) => `FlightAware · Vuelos de ${code}`,
    sectionRoute: "Ruta",
    seeOtherFlights: (o: string, d: string) => `Vuelos alternativos ${o}→${d}`,
    sectionMyFlight: "Mi vuelo",
    departs: "Sale:",
    arriveAt: "Llegar al aeropuerto:",
    trackFlight: (num: string) => `Tracking vuelo ${num}`,
    flightLinkNote:
      "* Los links de vuelo abren FlightAware. El día del vuelo muestran el avión en tiempo real. Antes de la fecha, muestran instancias anteriores del mismo número de vuelo.",

    // Calendar export
    exportCalendar: "Exportar a calendario",
    calendarExported: "Calendario exportado",
    // Share trip
    shareTrip: "Compartir viaje",
    shareCopied: "¡Link copiado!",
    shareFailed: "No se pudo copiar",
    // Notifications
    enableNotifications: "Activar notificaciones push",
    notificationsEnabled: "Notificaciones activas",
    notificationsBlocked: "Notificaciones bloqueadas",
    // Stale data
    dataStale: "Datos pueden estar desactualizados",
    // Timeline
    timelineTitle: "Cronograma del viaje",

    // Footer
    footer:
      "Datos: FAA ASWS API (nasstatus.faa.gov) · Solo muestra aeropuertos con problemas activos",
  },

  en: {
    // Header
    appTitle: "Airport Monitor",
    appSubtitle: "Real-time status · FAA ASWS API",
    autoRefresh: "Auto-refresh:",
    updating: "Updating...",
    update: "Refresh",
    nextRefresh: "Next in",

    // Global status bar
    noDelays: "No active delays at monitored airports",
    airportsWithIssues: (n: number) =>
      `${n} airport${n > 1 ? "s" : ""} with issues:`,

    // Tabs
    tabAirports: "✈ My airports",
    tabFlights: "🗓 My flights",
    tabSearch: "🔍 Flight search",
    tabHelp: "❓ Help",

    // Airport card
    noDelaysReported: "No delays reported",
    delay: "Delay",
    cause: "Reason",
    affects: "Affects",
    departures: "Departures",
    arrivals: "Arrivals",
    groundStop: "Ground Stop",
    until: "until",
    indefinite: "indefinite",
    groundDelayProgram: "Ground Delay Program",
    average: "Average",
    max: "Max",
    airportClosed: "Airport Closed",
    updated: "Updated",
    trend: "Trend",

    // Airport search
    addAirport: "Add airport",
    searchPlaceholder: "Search by code, city...",
    noResults: "No results",

    // Status badge labels
    statusOk: "Normal",
    statusMinor: "Minor delay",
    statusModerate: "Moderate delay",
    statusSevere: "Severe delay",
    statusGroundDelay: "Ground Delay",
    statusGroundStop: "Ground Stop",
    statusClosure: "CLOSED",
    statusUnknown: "Unknown",

    // Legend
    legendTitle: "",
    legend: [
      "🟢 Normal",
      "🟡 ≤15 min",
      "🟠 16–45 min",
      "🔴 >45 min",
      "🔴 Ground Delay",
      "🛑 Ground Stop",
      "⛔ Closed",
    ],

    // Error
    errorFAA: "FAA API error:",

    // Flights panel
    trip: "EZE → MIA → GCM → JFK → MIA → EZE · Mar 29 – Apr 12, 2026",
    faaButton: "Real-time delay status — FAA NAS Status",
    sectionAirport: "Departure airport",
    seeAllFlightsFrom: (code: string) => `FlightAware · Flights from ${code}`,
    sectionRoute: "Route",
    seeOtherFlights: (o: string, d: string) => `Alternative flights ${o}→${d}`,
    sectionMyFlight: "My flight",
    departs: "Departs:",
    arriveAt: "Arrive at airport by:",
    trackFlight: (num: string) => `Track flight ${num}`,
    flightLinkNote:
      "* Flight links open FlightAware. On the day of travel they show the aircraft in real time. Before the date, they show previous instances of the same flight number.",

    // Calendar export
    exportCalendar: "Export to calendar",
    calendarExported: "Calendar exported",
    // Share trip
    shareTrip: "Share trip",
    shareCopied: "Link copied!",
    shareFailed: "Could not copy",
    // Notifications
    enableNotifications: "Enable push notifications",
    notificationsEnabled: "Notifications enabled",
    notificationsBlocked: "Notifications blocked",
    // Stale data
    dataStale: "Data may be outdated",
    // Timeline
    timelineTitle: "Trip timeline",

    // Footer
    footer:
      "Data source: FAA ASWS API (nasstatus.faa.gov) · Only shows airports with active issues",
  },
} as const;

export type Translations = (typeof translations)[Locale];
