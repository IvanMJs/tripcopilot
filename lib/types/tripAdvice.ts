export interface PackingItem {
  item: string;
  reason: string;
  priority: "essential" | "recommended" | "optional";
}

export interface DestinationTips {
  code: string;
  city: string;
  tips: string[];
}

export interface LegNote {
  from: string;
  to: string;
  note: string;
}

export interface TripAdviceResult {
  summary: string;
  packing: PackingItem[];
  destination_tips: DestinationTips[];
  by_leg?: LegNote[];
}

export interface TripAdviceCacheEntry {
  data: TripAdviceResult;
  signature: string;
  timestamp: number;
}
