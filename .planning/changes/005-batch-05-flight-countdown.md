# Fix 005 — Flight Countdown + Lock Screen Notification

**Date:** 2026-03-21
**Status:** Deployed

## What was added

### In-app countdown (FlightCountdownBadge)
- New component `components/FlightCountdownBadge.tsx` — real-time countdown updating every second
- Shows "Sale en Xh Ymmin" for flights within the next 24h
- Amber styling when <= 60min (high urgency)
- Integrated in TripPanel above the flight list

### Lock screen notification
- Cron sends a push with `tag: "flight_countdown"` every run when flight is 30min–4h away
- Tag ensures only ONE countdown notification is shown at a time (browser auto-replaces)
- Closest iOS substitute to Dynamic Island — visible on lock screen without opening app

## Files changed

| File | Change |
|------|--------|
| `components/FlightCountdownBadge.tsx` | NEW — real-time countdown component |
| `components/TripPanel.tsx` | Integrate countdown badge |
| `app/api/cron/flight-notifications/route.ts` | Add countdown push notification |
| `public/push-sw.js` | Already forwards `tag` from payload — no change needed |
