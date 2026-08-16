export type BoundaryType = "convergent" | "divergent" | "transform";

export type Plate = {
  id: string;
  name: string;
  areaMillionKm2: number;
  velocity: { magnitude: number; direction: string; bearing: number };
  centroid: { lat: number; lng: number };
  color: string;
  summary: string;
  neighbors: string[];
  polygon: [number, number][];
};

export type Boundary = {
  id: string;
  name: string;
  type: BoundaryType;
  plates: string[];
  coordinates: [number, number][];
  description: string;
};

export type Earthquake = {
  id: string;
  place: string;
  magnitude: number;
  depthKm: number;
  date: string;
  occurredAt?: string | null;
  coordinates: [number, number];
  plateId?: string | null;
  source: "usgs" | "curated";
  sourceUrl?: string | null;
};

export type EarthquakeFeed = {
  events: Earthquake[];
  source: "usgs" | "curated";
  fetchedAt: string;
  refreshAfterSeconds: number;
};

export type MapLayers = {
  land: [number, number][][];
  plateBoundaries: { id: string; type: "boundary" | "subduction"; coordinates: [number, number][] }[];
};

export type Selection =
  | { kind: "plate"; item: Plate }
  | { kind: "boundary"; item: Boundary }
  | { kind: "earthquake"; item: Earthquake }
  | null;
