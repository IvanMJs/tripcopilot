export const AIRPORTS: Record<string, {
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  icao: string;
  /** Country name — defaults to USA when omitted */
  country?: string;
  /** false = no FAA ASWS coverage (international airports) */
  isFAA?: boolean;
}> = {
  ATL: { name: "Hartsfield-Jackson Atlanta",          city: "Atlanta",       state: "GA", lat: 33.6407,  lng: -84.4277,  icao: "KATL" },
  LAX: { name: "Los Angeles International",            city: "Los Angeles",   state: "CA", lat: 33.9425,  lng: -118.4081, icao: "KLAX" },
  ORD: { name: "O'Hare International",                 city: "Chicago",       state: "IL", lat: 41.9742,  lng: -87.9073,  icao: "KORD" },
  DFW: { name: "Dallas/Fort Worth International",      city: "Dallas",        state: "TX", lat: 32.8998,  lng: -97.0403,  icao: "KDFW" },
  DEN: { name: "Denver International",                 city: "Denver",        state: "CO", lat: 39.8561,  lng: -104.6737, icao: "KDEN" },
  JFK: { name: "John F. Kennedy International",        city: "New York",      state: "NY", lat: 40.6413,  lng: -73.7781,  icao: "KJFK" },
  SFO: { name: "San Francisco International",          city: "San Francisco", state: "CA", lat: 37.6213,  lng: -122.3790, icao: "KSFO" },
  SEA: { name: "Seattle-Tacoma International",         city: "Seattle",       state: "WA", lat: 47.4502,  lng: -122.3088, icao: "KSEA" },
  LAS: { name: "Harry Reid International",             city: "Las Vegas",     state: "NV", lat: 36.0840,  lng: -115.1537, icao: "KLAS" },
  MCO: { name: "Orlando International",                city: "Orlando",       state: "FL", lat: 28.4312,  lng: -81.3081,  icao: "KMCO" },
  MIA: { name: "Miami International",                  city: "Miami",         state: "FL", lat: 25.7959,  lng: -80.2870,  icao: "KMIA" },
  CLT: { name: "Charlotte Douglas International",      city: "Charlotte",     state: "NC", lat: 35.2144,  lng: -80.9473,  icao: "KCLT" },
  EWR: { name: "Newark Liberty International",         city: "Newark",        state: "NJ", lat: 40.6895,  lng: -74.1745,  icao: "KEWR" },
  PHX: { name: "Phoenix Sky Harbor International",     city: "Phoenix",       state: "AZ", lat: 33.4373,  lng: -112.0078, icao: "KPHX" },
  IAH: { name: "George Bush Intercontinental",         city: "Houston",       state: "TX", lat: 29.9902,  lng: -95.3368,  icao: "KIAH" },
  BOS: { name: "Logan International",                  city: "Boston",        state: "MA", lat: 42.3656,  lng: -71.0096,  icao: "KBOS" },
  MSP: { name: "Minneapolis-Saint Paul International", city: "Minneapolis",   state: "MN", lat: 44.8848,  lng: -93.2223,  icao: "KMSP" },
  DTW: { name: "Detroit Metropolitan Wayne County",    city: "Detroit",       state: "MI", lat: 42.2162,  lng: -83.3554,  icao: "KDTW" },
  FLL: { name: "Fort Lauderdale-Hollywood International", city: "Fort Lauderdale", state: "FL", lat: 26.0742, lng: -80.1506, icao: "KFLL" },
  LGA: { name: "LaGuardia Airport",                    city: "New York",      state: "NY", lat: 40.7769,  lng: -73.8740,  icao: "KLGA" },
  BWI: { name: "Baltimore/Washington International",   city: "Baltimore",     state: "MD", lat: 39.1774,  lng: -76.6684,  icao: "KBWI" },
  SLC: { name: "Salt Lake City International",         city: "Salt Lake City",state: "UT", lat: 40.7899,  lng: -111.9791, icao: "KSLC" },
  PHL: { name: "Philadelphia International",           city: "Philadelphia",  state: "PA", lat: 39.8744,  lng: -75.2424,  icao: "KPHL" },
  DCA: { name: "Ronald Reagan Washington National",    city: "Washington",    state: "DC", lat: 38.8512,  lng: -77.0402,  icao: "KDCA" },
  IAD: { name: "Washington Dulles International",      city: "Dulles",        state: "VA", lat: 38.9531,  lng: -77.4565,  icao: "KIAD" },
  HNL: { name: "Daniel K. Inouye International",       city: "Honolulu",      state: "HI", lat: 21.3187,  lng: -157.9225, icao: "PHNL" },
  MDW: { name: "Chicago Midway International",         city: "Chicago",       state: "IL", lat: 41.7868,  lng: -87.7522,  icao: "KMDW" },
  SAN: { name: "San Diego International",              city: "San Diego",     state: "CA", lat: 32.7338,  lng: -117.1933, icao: "KSAN" },
  TPA: { name: "Tampa International",                  city: "Tampa",         state: "FL", lat: 27.9756,  lng: -82.5333,  icao: "KTPA" },
  PDX: { name: "Portland International",               city: "Portland",      state: "OR", lat: 45.5898,  lng: -122.5951, icao: "KPDX" },
  EZE: { name: "Ministro Pistarini International",     city: "Buenos Aires",  state: "AR", lat: -34.8222, lng: -58.5358,  icao: "SAEZ", country: "Argentina",  isFAA: false },
  GCM: { name: "Owen Roberts International",           city: "Grand Cayman",  state: "KY", lat: 19.2928,  lng: -81.3577,  icao: "MWCR", country: "Cayman Islands", isFAA: false },

  // ── Latin America & Caribbean ─────────────────────────────────────────────
  BOG: { name: "El Dorado International",              city: "Bogotá",        state: "CO", lat:  4.7016,  lng: -74.1469,  icao: "SKBO", country: "Colombia",    isFAA: false },
  LIM: { name: "Jorge Chávez International",           city: "Lima",          state: "PE", lat: -12.0219, lng: -77.1143,  icao: "SPJC", country: "Peru",        isFAA: false },
  GRU: { name: "São Paulo/Guarulhos International",    city: "São Paulo",     state: "SP", lat: -23.4356, lng: -46.4731,  icao: "SBGR", country: "Brazil",      isFAA: false },
  GIG: { name: "Rio de Janeiro/Galeão International",  city: "Rio de Janeiro",state: "RJ", lat: -22.8099, lng: -43.2505,  icao: "SBGL", country: "Brazil",      isFAA: false },
  SCL: { name: "Arturo Merino Benítez International",  city: "Santiago",      state: "CL", lat: -33.3930, lng: -70.7858,  icao: "SCEL", country: "Chile",       isFAA: false },
  MVD: { name: "Carrasco International",               city: "Montevideo",    state: "UY", lat: -34.8383, lng: -56.0308,  icao: "SUMU", country: "Uruguay",     isFAA: false },
  PTY: { name: "Tocumen International",                city: "Panama City",   state: "PA", lat:  9.0714,  lng: -79.3835,  icao: "MPTO", country: "Panama",      isFAA: false },
  CUN: { name: "Cancún International",                 city: "Cancún",        state: "QR", lat: 21.0365,  lng: -86.8771,  icao: "MMUN", country: "Mexico",      isFAA: false },
  MEX: { name: "Benito Juárez International",          city: "Mexico City",   state: "MX", lat: 19.4363,  lng: -99.0721,  icao: "MMMX", country: "Mexico",      isFAA: false },
  NAS: { name: "Lynden Pindling International",        city: "Nassau",        state: "BS", lat: 25.0389,  lng: -77.4662,  icao: "MYNN", country: "Bahamas",     isFAA: false },
  ANU: { name: "V.C. Bird International",              city: "St. John's",    state: "AG", lat: 17.1367,  lng: -61.7926,  icao: "TAPA", country: "Antigua",     isFAA: false },
  UIO: { name: "Mariscal Sucre International",         city: "Quito",         state: "EC", lat: -0.1292,  lng: -78.3575,  icao: "SEQM", country: "Ecuador",     isFAA: false },
  VVI: { name: "Viru Viru International",              city: "Santa Cruz",    state: "BO", lat: -17.6448, lng: -63.1354,  icao: "SLVR", country: "Bolivia",     isFAA: false },
};

export const DEFAULT_AIRPORTS = ["MIA", "JFK", "EZE", "GCM"];
