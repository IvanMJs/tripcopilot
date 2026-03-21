# Fix 003 — Locale Sync, Accommodation Validation & Push Unsubscribe (Batch 3)

**Date:** 2026-03-21
**Commit:** 64154be
**Status:** ✅ Deployed

## What was broken

1. **Locale no se sincronizaba entre dispositivos** — Al abrir la app en un dispositivo nuevo (sin localStorage), el idioma siempre arrancaba en español aunque el usuario lo hubiera cambiado antes. Además, si `supabase.auth.updateUser` fallaba por red, el cron mandaba notificaciones en el idioma incorrecto sin posibilidad de recovery.

2. **Alojamientos aceptaban datos inválidos** — `updateAccommodation` no validaba que el nombre no sea vacío ni que los horarios sean formato HH:MM. Se podían guardar nombres en blanco o tiempos como "2:3" que no coincidían con el formato esperado en el cron.

3. **Deshabilitar notificaciones no eliminaba la suscripción del servidor** — El botón de "desactivar alertas" en la app llamaba `disableNotifications()` que solo cambia un estado React local. La suscripción push seguía en la tabla `push_subscriptions`, así que el cron continuaba enviando notificaciones push aunque el usuario las hubiera "desactivado".

## What was changed

| File | Change |
|------|--------|
| `contexts/LanguageContext.tsx` | `load()` ahora lee auth metadata como fallback si no hay localStorage; `setLocale` es async y retry updateUser |
| `hooks/useUserTrips.ts` | `updateAccommodation`: validar nombre no vacío y times con regex `/^\d{2}:\d{2}$/` |
| `hooks/useServiceWorker.ts` | Nuevo `unsubscribeFromPush()` — llama `sub.unsubscribe()` + DELETE a `/api/push/subscribe` |
| `app/app/page.tsx` | Destructura `unsubscribeFromPush` y lo llama junto a `disableNotifications()` |

## Why this fix works

**Locale sync**: Separar la fuente de verdad: localStorage para el cliente (respuesta inmediata), auth metadata para el servidor/cron (persistencia cross-device). En dispositivo nuevo, si no hay localStorage se consulta auth metadata. El retry de `updateUser` cubre cortes de red transitorios.

**Accommodation validation**: El trimming + regex `HH:MM` garantiza que solo datos bien formados llegan a Supabase. El rechazo silencioso de nombre vacío previene que se pierda el nombre por un doble-click o submit accidental.

**Push unsubscribe**: La secuencia correcta es: (1) `sub.unsubscribe()` — el browser cancela la suscripción con el push service, (2) DELETE al API — elimina el endpoint de `push_subscriptions` en Supabase. Esto cierra el gap donde el cron tenía el endpoint y seguía enviando.

## What to watch for

- El retry de `updateUser` usa `setTimeout(3000)` — si el usuario cambia idioma offline y cierra la app antes de 3s, la segunda actualización no corre. Aceptable trade-off.
- `unsubscribeFromPush` falla silenciosamente si el SW no está registrado — en ese caso la suscripción puede quedar en la DB. El cron tiene lógica para limpiar endpoints inválidos (404/410) cuando intenta enviar.
- La validación de tiempo en `updateAccommodation` es cliente-only. Si alguien llama la API directamente con un tiempo malformado, todavía entraría a la DB.

## Estado general del proyecto post-fixes

Los **10 issues críticos** identificados en el análisis inicial están todos resueltos:

| # | Issue | Batch | Status |
|---|-------|-------|--------|
| 1 | Optimistic updates sin rollback | 1 | ✅ |
| 2 | AI parsed data sin validación | 1 | ✅ |
| 3 | Errores de red silenciosos intl-status | 1 | ✅ |
| 4 | duplicateTrip corrompe datos parciales | 2 | ✅ |
| 5 | Cache trip advice sin aislamiento usuario | 2 | ✅ |
| 6 | Trip advice JSON sin validación schema | 2 | ✅ |
| 7 | Push subscription security | 2 | ✅ |
| 8 | Connection risk ignora zonas horarias | 2 | ✅ |
| 9 | Duplicate flight import sin detección | 2 | ✅ |
| 10 | Locale sync + accommodation validation + push unsubscribe | 3 | ✅ |
