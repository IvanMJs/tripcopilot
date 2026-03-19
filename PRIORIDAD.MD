
  ---
  🔴 CRÍTICO — Bugs / Seguridad

  - [x] 1. RLS en push_subscriptions — verificado correcto, política auth.uid() = user_id activa
  - [x] 2. Timezone hardcodeada (Argentina) — reemplazado por IANA timezones en airports.ts + localToUTC()
  - [x] 3. Español hardcodeado en cron — reemplazado por CRON_LABELS bilingüe + getUserLocale()
  - [x] 4. notification_log.flight_id bug en alojamientos — migración DB + split semántico sendAndLogFlight / sendAndLogAccommodation

  ---
  🟠 ALTA PRIORIDAD — Confiabilidad core

  - [ ] 5. Sin retry en notificaciones fallidas
  - [ ] 6. Sin rate limiting en APIs propias
  - [ ] 7. Sin manejo de expiración de tokens push
  - [ ] 8. Sin circuit breaker para AeroDataBox / FAA
  - [ ] 9. Sin health check endpoint

  ---
  🟡 MEDIA PRIORIDAD — Negocio y monetización

  - [ ] 10. Sin Stripe / billing
        No hay modelo de pago implementado. Sin esto no hay negocio. Necesita: plan free (1 viaje activo, notificaciones básicas) vs. Pro (viajes ilimitados, AI, hotel notifs).

  - [x] 11. Sin analytics de uso
        Implementado: Vercel Analytics (pageviews) + Speed Insights + custom events (flight_added, accommodation_added, push_permission_granted, shared_*, calendar_exported, etc.)

  - [x] 12. Sin error monitoring (Sentry)
        Implementado: @sentry/nextjs con wizard, sentry.client/server/edge.config.ts, ErrorBoundary conectado a Sentry.captureException(), Session Replay, tunnel /monitoring.

  - [x] 13. Sin onboarding para nuevos usuarios
        Implementado: OnboardingModal en primer acceso + viaje de ejemplo EZE→MIA con hotel (datos reales, fechas dinámicas). localStorage "tripcopilot-onboarded" como flag.

  - [x] 14. Sin historial de viajes pasados
        Implementado: sección "Historial" colapsable en TripListView. Trips con todos los vuelos pasados se mueven automáticamente. Sin migración DB.

  - [x] 15. Sin notificaciones visibles para el usuario
        Implementado: sección colapsable al final de cada FlightCard con log de notificaciones enviadas (tipo + timestamp). API route /api/notifications/log + hook useNotificationLog.

  ---
  🟡 MEDIA PRIORIDAD — Features de producto

  - [ ] 16. Sin OCR de boarding pass / QR scan
        El import AI acepta texto e imagen pero no hay un flujo específico de "escaneá tu boarding pass". Con la cámara del celular + jsQR/ZXing se podría parsear el QR directamente.

  - [x] 17. Sin soporte de zonas horarias por aeropuerto
        Implementado: badge con abreviatura del timezone (EST, ART, GMT, etc.) junto al horario de salida en FlightCard. DST-aware via Intl.DateTimeFormat.

  - [ ] 18. Sin import de hotel desde confirmación de Booking/Airbnb
        El AI de accommodations existe pero es manual. Un parser de emails de confirmación de hotel (igual que hace TripIt) o un import AI de screenshot de Booking subiría mucho la adopción de ese feature.

  - [ ] 19. Sin trip sharing completo (solo WhatsApp)
        El share va a WhatsApp con texto plano. Falta: URL pública de solo-lectura del itinerario (útil para compartir con familia), o exportar como PDF/imagen.

  - [ ] 20. Sin soporte para transporte terrestre
        Bus, tren, ferry — muchos viajes combinan vuelo + tren. No hay forma de agregar segmentos de ground transport. Afecta la completitud del timeline.

  - [ ] 21. Sin modo offline funcional
        La PWA tiene Service Worker pero no cachea los datos del viaje para uso sin conexión. En el aeropuerto el WiFi es malo. Ver el itinerario offline debería ser garantizado.

  - [ ] 22. Sin widget de vuelo para pantalla de inicio (iOS/Android)
        Las apps de competidores tienen widgets nativos que muestran el próximo vuelo. Con PWA es imposible hoy, pero con una app nativa (React Native + Expo) sería el diferenciador de experiencia más grande.

  - [ ] 23. Análisis de conexiones no contempla cambio de aeropuerto
        Si una conexión es JFK→EWR o CDG→ORY (aeropuertos distintos), el MCT debería ser mucho mayor. No está contemplado.

  - [ ] 24. Sin soporte para múltiples viajeros en un viaje
        Una familia o pareja no puede compartir el mismo viaje y recibir notificaciones por separado. Cada uno tiene que crear su propio viaje.

  ---
  🟢 BAJA PRIORIDAD — Deuda técnica y calidad de código

  - [x] 25. TripPanel.tsx tiene 2000+ líneas
        Resuelto: split en FlightCard.tsx + TripPanelLabels.ts. TripPanel bajó de ~1250 a ~280 líneas.

  - [ ] 26. Sin tests (ni unit ni e2e)
        Cero cobertura. Los helpers críticos como timeInWindow, calculateTripRiskScore, analyzeAllConnections y el cron deberían tener tests. Un bug en timeInWindow en producción ya pasó (midnight-safe fix).

  - [x] 27. any tipado en el cron y varias partes
        Resuelto: FlightRow, AccommodationRow, PushSubRow, AeroDataBoxFlightLeg, AeroDataBoxResponse. SupabaseClient reemplaza supabase: any en helpers.

  - [x] 28. Sin CSP headers ni helmet
        Resuelto: headers en next.config.mjs — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Content-Security-Policy con connect-src limitado a Supabase + FAA + AeroDataBox.

  - [ ] 29. AIRPORTS es un archivo estático grande
        La lista de aeropuertos está en un objeto JS hardcodeado. Si hay un aeropuerto que no está en la lista, simplemente no funciona sin un deploy. Debería estar en la DB con capacidad de actualización.

  - [ ] 30. Logs de cron solo en DB, sin visibilidad operacional
        cron_runs es una tabla en Supabase pero no hay dashboard ni alertas. Un panel de administración básico (últimas corridas, errores, requests API consumidos) ayudaría a operar el producto.

  ---
  🎨 EXTRA — Mejoras de UX/UI (fuera del doc original)

  - [x] Carousels landing reemplazados con SwiperJS (NotifCarousel + AppScreenshotCarousel)
        Autoplay, grab cursor, loop, dots custom, breakpoints responsive, misma visual.

  ---
  Progreso: 11/30 ítems completados (+ 1 extra)

  ┌────────────────────────┬──────────┬──────────┬─────────────────────┐
  │       Categoría        │ Total    │ Hecho    │      Urgencia       │
  ├────────────────────────┼──────────┼──────────┼─────────────────────┤
  │ Bugs / Seguridad       │ 4        │ 4 ✅     │ Ahora               │
  ├────────────────────────┼──────────┼──────────┼─────────────────────┤
  │ Confiabilidad core     │ 5        │ 0        │ Antes de crecer     │
  ├────────────────────────┼──────────┼──────────┼─────────────────────┤
  │ Negocio / Monetización │ 6        │ 5 ✅     │ Antes de lanzar     │
  ├────────────────────────┼──────────┼──────────┼─────────────────────┤
  │ Features de producto   │ 9        │ 2 ✅     │ Roadmap corto       │
  ├────────────────────────┼──────────┼──────────┼─────────────────────┤
  │ Deuda técnica          │ 6        │ 3 ✅     │ Paralelo al roadmap │
  ├────────────────────────┼──────────┼──────────┼─────────────────────┤
  │ Total                  │ 30       │ 14 ✅    │                     │
  └────────────────────────┴──────────┴──────────┴─────────────────────┘
