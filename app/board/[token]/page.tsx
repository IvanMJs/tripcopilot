import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { PublicBoardView } from "@/components/tripboard/PublicBoardView";
import { AIRPORTS } from "@/lib/airports";
import type { BoardFlight } from "@/hooks/useBoardFlights";

export const dynamic = "force-dynamic";

interface DbFlight {
  id: string;
  airline_code: string;
  flight_number: string;
  origin_code: string;
  destination_code: string;
  iso_date: string;
  departure_time: string | null;
  terminal: string | null;
}

function computeStatus(isoDate: string, departureTime: string): BoardFlight["status"] {
  const now = new Date();
  const depMs = new Date(`${isoDate}T${departureTime}`).getTime();
  const diffMin = (depMs - now.getTime()) / 60000;
  if (diffMin < -20) return "landed";
  if (diffMin <= 30) return "boarding";
  return "ontime";
}

function computeCountdown(isoDate: string, departureTime: string, status: BoardFlight["status"]): string {
  const depMs = new Date(`${isoDate}T${departureTime}`).getTime();
  const diffMin = Math.round((depMs - Date.now()) / 60000);
  if (status === "landed") {
    const ago = -diffMin;
    return ago < 60 ? `Aterrizó hace ${ago}m` : `Aterrizó hace ${Math.floor(ago / 60)}h`;
  }
  if (status === "boarding") return "Embarcando ahora";
  if (diffMin <= 0) return "Salió";
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return h > 0 ? `en ${h}h ${m}m` : `en ${m}m`;
}

export default async function PublicBoardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Look up the shared trip by its public token
  const { data: sharedTrip } = await supabase
    .from("shared_trips")
    .select("trip_id, owner_display_name")
    .eq("token", token)
    .maybeSingle();

  if (!sharedTrip) notFound();

  const { data: trip } = await supabase
    .from("trips")
    .select("flights(*)")
    .eq("id", sharedTrip.trip_id)
    .maybeSingle();

  const dbFlights = ((trip?.flights as DbFlight[]) ?? []).sort(
    (a, b) => new Date(`${a.iso_date}T${a.departure_time ?? "00:00"}`).getTime()
             - new Date(`${b.iso_date}T${b.departure_time ?? "00:00"}`).getTime(),
  );

  const flights: BoardFlight[] = dbFlights.map((f) => {
    const depTime = f.departure_time ?? "00:00";
    const status = computeStatus(f.iso_date, depTime);
    const cd = computeCountdown(f.iso_date, depTime, status);
    const destInfo = AIRPORTS[f.destination_code];
    return {
      id: f.id,
      airline: f.airline_code,
      num: f.flight_number,
      orig: f.origin_code,
      dest: f.destination_code,
      city: (destInfo?.city ?? f.destination_code).toUpperCase(),
      time: depTime,
      gate: f.terminal ?? "—",
      status,
      cd,
      isoDate: f.iso_date,
    };
  });

  return (
    <PublicBoardView
      flights={flights}
      ownerName={sharedTrip.owner_display_name ?? undefined}
    />
  );
}
