import { TripTab } from "@/lib/types";

/** Generates an example trip with dates relative to today so it never looks expired. */
export function makeExampleTrip(locale: "es" | "en"): TripTab {
  const today = new Date();
  const flightDate   = new Date(today.getTime() + 30  * 86400000);
  const checkInDate  = new Date(today.getTime() + 31  * 86400000);
  const checkOutDate = new Date(today.getTime() + 34  * 86400000);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  return {
    id: "__example__",
    name: locale === "es" ? "Miami · Ejemplo" : "Miami · Example",
    flights: [
      {
        id:              "example-flight-1",
        flightCode:      "AA900",
        airlineCode:     "AA",
        airlineName:     "American Airlines",
        airlineIcao:     "AAL",
        flightNumber:    "900",
        originCode:      "EZE",
        destinationCode: "MIA",
        isoDate:         fmt(flightDate),
        departureTime:   "20:30",
        arrivalBuffer:   2,
      },
    ],
    accommodations: [
      {
        id:               "example-acc-1",
        tripId:           "__example__",
        name:             "Marriott Miami Biscayne Bay",
        checkInDate:      fmt(checkInDate),
        checkInTime:      "15:00",
        checkOutDate:     fmt(checkOutDate),
        checkOutTime:     "11:00",
        confirmationCode: "MXPB7K",
        address:          "1633 N Bayshore Dr, Miami, FL 33132",
      },
    ],
  };
}
