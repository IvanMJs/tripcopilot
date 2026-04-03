# Bug crítico: Retraso de vuelo no se refleja automáticamente en la app

**Fecha detectado:** 2026-03-31
**Vuelo afectado:** AA956 MIA→GCM (departing 2026-03-31, scheduled 12:55 → real 14:00, +1h5min)
**Severidad:** Alta — el usuario ve hora incorrecta y estado "Normal" cuando el vuelo está demorado

---

## Síntoma

El card del vuelo mostraba:
- Estado: `● Normal`
- Hora de salida: `12:55` (la original)
- Countdown: `Sale en 2h` (basado en hora incorrecta)

Cuando en realidad el vuelo salía a las 14:00 con 1h5min de demora.

---

## Causa raíz (multi-capa)

### 1. El campo `departure_time` en DB no se actualiza automáticamente

La columna `flights.departure_time` se graba cuando el usuario agrega el vuelo y **nunca se actualiza**. Si AeroDataBox o AviationStack detectan una demora, el dato queda en el hook de live status (`useFlightLiveStatus`) en memoria, pero no persiste en la DB.

**Impacto:** Si el usuario recarga la app, cierra el PWA, o el live status falla por rate limit, ve la hora original.

### 2. `iso_date` guarda la fecha de creación, no la de vuelo

El vuelo AA956 con fecha de vuelo 2026-03-31 tenía `iso_date = '2026-03-31'` (correcto en este caso), pero en la investigación inicial buscamos `'2026-03-29'` creyendo que era esa fecha por las capturas. Esto reveló que la relación entre `iso_date` y la fecha real del vuelo puede generar confusión si no se guarda correctamente al momento de agregar el vuelo.

### 3. El cron de notificaciones no escribe en DB

`/api/cron/flight-notifications/route.ts` detecta demoras y envía push notifications, pero **no hace `UPDATE flights SET departure_time`**. El dato "correcto" solo existe durante la ejecución del cron y se pierde.

### 4. La UI depende de live data efímera

`FlightCardHeader.tsx` computa `actualDepTime` a partir de `liveData?.delayMinutes` (del hook en memoria). Si el hook no tiene datos (red offline, rate limit, vuelo pasado), muestra la hora original de DB.

---

## Fix manual aplicado

```sql
UPDATE flights
SET departure_time = '14:00'
WHERE flight_code = 'AA956'
  AND iso_date = '2026-03-31';
```

---

## Solución definitiva (sin pagar APIs adicionales)

### Opción A — El cron actualiza `departure_time` en DB (recomendada)

Cuando el cron detecta `delayMinutes > 0`, además de enviar la notificación, hace:

```ts
await supabase
  .from("flights")
  .update({ departure_time: actualDepTime })
  .eq("id", flight.id);
```

**Ventaja:** La DB siempre tiene la hora actualizada. No requiere live data en el cliente.
**Costo:** Cero — es una escritura en Supabase que ya tenemos.

### Opción B — El live status hook persiste el dato

En `useFlightLiveStatus`, cuando `delayMinutes > 0`, llamar a un endpoint que actualice `flights.departure_time`.

**Ventaja:** Se actualiza en tiempo real al abrir el card.
**Desventaja:** Requiere request adicional del cliente, solo funciona si el usuario abre la app.

### Opción C — Columna `departure_time_actual` separada

Agregar columna nullable `departure_time_actual`. La UI muestra esta si existe, si no cae a `departure_time`.

**Ventaja:** Preserva dato original vs dato real.
**Desventaja:** Requiere migración de DB.

---

## Recomendación

**Implementar Opción A** en el cron (`/api/cron/flight-notifications/route.ts`):

Cuando se detecta `delayMinutes > 0` y se va a enviar notificación bracket `flight_delay_real_*`, también ejecutar:

```ts
const [h, m] = flight.departure_time.split(":").map(Number);
const totalMin = h * 60 + m + status.delayMinutes;
const actualHour = Math.floor(totalMin / 60) % 24;
const actualMin = totalMin % 60;
const actualDepTime = `${String(actualHour).padStart(2, "0")}:${String(actualMin).padStart(2, "0")}`;

await supabase
  .from("flights")
  .update({ departure_time: actualDepTime })
  .eq("id", flight.id);
```

Esto garantiza que aunque el usuario no abra la app, al próxima carga verá la hora correcta.

---

## Archivos a modificar

- `app/api/cron/flight-notifications/route.ts` — añadir UPDATE después de detectar demora
- `components/flight-card/FlightCardHeader.tsx` — ya maneja `delayMinutes` correctamente, pero si `departure_time` en DB ya está actualizado, el display es correcto incluso sin live data
