# TripCopilot — Roadmap to App Store

Estado: **En progreso**
Inicio: 2026-05-06
Meta: App Store + Play Store con reviews reales

---

## Fase 0: Dual-Mode Architecture (Completada)

- [x] useUIMode hook + UIModeContext
- [x] ModeGate component
- [x] Onboarding 3-screen flow (ModeSelector, QuickImport, SetupComplete)
- [x] ModeToggle segmented control en Settings
- [x] ProgressDots + Confetti
- [x] Simplificación UI Relax (DepartureBoard, TripPanel, FlightCardBody, AirportCard)
- [x] Navegación adaptativa (BottomNav 3/4 tabs, DesktopSidebar)
- [x] Notification engagement loop (5 tipos nuevos, mode-aware)
- [x] PersonalRecords + StampCard animations
- [x] Touch targets 44px en todos los componentes

---

## Bloque A: Fixes Críticos (Completado)

- [x] **A1** — Auth + rate limit en `/api/intl-status` (proteger API AeroDataBox)
- [x] **A2** — Quitar `unsafe-eval` de CSP en producción
- [x] **A3** — Fix manifest.json (start_url, theme_color, id, screenshots)
- [x] **A4** — Merge N+1 queries en page.tsx mount
- [x] **A5** — Rate limit + cache en `/u/[username]`
- [x] **A6** — Admin basado en DB, no email hardcodeado
- [x] **A7** — OG images bilingüe
- [x] **A8** — Lazy loading de 14 componentes condicionales
- [x] **A9** — Sentry capture en trip-assistant stream errors
- [x] **A10** — VAPID lazy init en 7 rutas web-push (fix build)

---

## Bloque B: Decomposición del God Component (Completado)

- [x] **B0** — Extraer constantes a `lib/constants.ts`
- [x] **B3** — Extraer UserSessionProvider (auth, perfil, logout)
- [x] **B1** — Extraer TripManagementProvider (CRUD, draft, 14 handlers)
- [x] **B2** — Extraer NotificationSetupProvider (push, SW, sheets)
- [x] **B4** — Extraer AppShell + AppHeader + TabContent + AppModals
- [x] **B5** — page.tsx como orquestador (1,400 → 144 líneas)

---

## Bloque C: Features Premium (Completado)

- [x] **C1** — Offline Boarding Pass Wallet (IndexedDB, compresión, wake lock, swipe)
- [x] **C2** — Expense Tracker (captura recibos, 9 monedas, 6 categorías, summary)
- [x] **C3** — Visa Checker (140+ combinaciones, 8 pasaportes)
- [x] **C4** — Smart Packing Notifications (clima + cron T-2d + checklist)
- [x] **C5** — Morning Briefing enriquecido (clima, conexión, puerta)
- [x] **C6** — Passport Expiry Tracker (cron mensual, status badge)
- [x] **C7** — Trip Journal AI-Generated (Claude API + editor + share)
- [x] **C8** — Milestone Celebrations (9 logros, toast confetti, grid perfil)
- [x] **C9** — Live Delay Feed Pilot (SVG chart, countdown, FAA data)

---

## Bloque D: Native Wrapper (Capacitor)

- [ ] **D1** — Setup Capacitor + configs iOS/Android
- [ ] **D2** — Native push notifications (FCM + APNs)
- [ ] **D3** — Deep links / Universal Links
- [ ] **D4** — Splash screen + app icons
- [ ] **D5** — iOS Widget (WidgetKit + Swift)
- [ ] **D6** — Android Widget (Kotlin)
- [ ] **D7** — App Store screenshots + metadata + privacy policy
- [ ] **D8** — TestFlight + Play Console testing
- [ ] **D9** — Submit to review
