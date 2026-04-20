"use client";

import { useMemo } from "react";
import { AIRPORTS } from "@/lib/airports";
import type { TripTab } from "@/lib/types";

export interface VisitedCountry {
  code: string;       // ISO-3166-1 alpha-2 e.g. "US", "AR"
  name: string;       // Country name e.g. "Argentina"
  flag: string;       // Emoji flag e.g. "🇦🇷"
  firstVisit: string; // "Mar 2022"
  places: string[];   // Unique city names visited
  airports: string[]; // IATA codes used
  lat: number;        // Centroid of airports in that country from the trip
  lng: number;
}

/** Derive ISO-2 code from country name. Covers all countries in AIRPORTS. */
function nameToISO2(name: string): string {
  const MAP: Record<string, string> = {
    "USA": "US", "United States": "US", "Argentina": "AR", "Brazil": "BR",
    "Chile": "CL", "Colombia": "CO", "Peru": "PE", "Uruguay": "UY",
    "Mexico": "MX", "Canada": "CA", "Cuba": "CU", "Cayman Islands": "KY",
    "Panama": "PA", "Costa Rica": "CR", "Guatemala": "GT", "Honduras": "HN",
    "El Salvador": "SV", "Nicaragua": "NI", "Belize": "BZ", "Jamaica": "JM",
    "Dominican Republic": "DO", "Haiti": "HT", "Puerto Rico": "PR",
    "Bahamas": "BS", "Barbados": "BB", "Trinidad and Tobago": "TT",
    "Curacao": "CW", "Aruba": "AW", "Venezuela": "VE", "Bolivia": "BO",
    "Ecuador": "EC", "Paraguay": "PY", "Guyana": "GY", "Suriname": "SR",
    "Spain": "ES", "France": "FR", "Germany": "DE", "Italy": "IT",
    "United Kingdom": "GB", "Portugal": "PT", "Netherlands": "NL",
    "Switzerland": "CH", "Austria": "AT", "Belgium": "BE", "Ireland": "IE",
    "Sweden": "SE", "Norway": "NO", "Denmark": "DK", "Finland": "FI",
    "Poland": "PL", "Czech Republic": "CZ", "Hungary": "HU", "Romania": "RO",
    "Greece": "GR", "Turkey": "TR", "Russia": "RU", "Ukraine": "UA",
    "United Arab Emirates": "AE", "Qatar": "QA", "Saudi Arabia": "SA",
    "Israel": "IL", "Egypt": "EG", "Morocco": "MA", "South Africa": "ZA",
    "Nigeria": "NG", "Kenya": "KE", "Ethiopia": "ET",
    "Japan": "JP", "China": "CN", "South Korea": "KR", "India": "IN",
    "Thailand": "TH", "Singapore": "SG", "Australia": "AU",
    "New Zealand": "NZ", "Indonesia": "ID", "Malaysia": "MY",
    "Philippines": "PH", "Vietnam": "VN", "Hong Kong": "HK",
  };
  return MAP[name] ?? "XX";
}

/** ISO-2 → emoji flag via Unicode regional indicator */
function isoToFlag(code: string): string {
  if (code === "XX") return "🏳";
  return Array.from(code.toUpperCase()).map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join("");
}

/** Format isoDate "YYYY-MM-DD" → "Mar 2022" */
function formatMonth(isoDate: string, locale: string = "es"): string {
  const [y, m] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(locale === "en" ? "en-US" : "es-AR", { month: "short", year: "numeric" });
}

export function useVisitedCountries(trips: TripTab[]): VisitedCountry[] {
  return useMemo(() => {
    type Entry = { name: string; airports: Set<string>; places: Set<string>; lats: number[]; lngs: number[]; dates: string[] };
    const byName = new Map<string, Entry>();

    for (const trip of trips) {
      for (const flight of trip.flights) {
        for (const iata of [flight.originCode, flight.destinationCode]) {
          const info = AIRPORTS[iata];
          if (!info) continue;
          const countryName = info.country ?? "USA";
          if (!byName.has(countryName)) {
            byName.set(countryName, { name: countryName, airports: new Set(), places: new Set(), lats: [], lngs: [], dates: [] });
          }
          const entry = byName.get(countryName)!;
          entry.airports.add(iata);
          if (info.city) entry.places.add(info.city);
          entry.lats.push(info.lat);
          entry.lngs.push(info.lng);
          if (flight.isoDate) entry.dates.push(flight.isoDate);
        }
      }
    }

    return Array.from(byName.values())
      .map(e => {
        const code = nameToISO2(e.name);
        const firstDate = e.dates.sort()[0] ?? "";
        return {
          code,
          name: e.name,
          flag: isoToFlag(code),
          firstVisit: firstDate ? formatMonth(firstDate) : "",
          places: Array.from(e.places),
          airports: Array.from(e.airports),
          lat: e.lats.reduce((a, b) => a + b, 0) / e.lats.length,
          lng: e.lngs.reduce((a, b) => a + b, 0) / e.lngs.length,
        };
      })
      .sort((a, b) => a.firstVisit.localeCompare(b.firstVisit));
  }, [trips]);
}
