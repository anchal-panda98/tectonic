import type { Boundary, EarthquakeFeed, MapLayers, Plate } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error(`The Tectonica API returned ${response.status}.`);
  return response.json() as Promise<T>;
}

export function getEarthquakeFeed() {
  return request<EarthquakeFeed>("/api/earthquakes?min_magnitude=4");
}

export function getGlobeData() {
  return request<Array<Pick<Plate, "id">>>("/api/plates").then(async (summaries) => {
    const plates = await Promise.all(summaries.map(({ id }) => request<Plate>(`/api/plates/${id}`)));
    const [boundaries, earthquakes, mapLayers] = await Promise.all([
      request<Boundary[]>("/api/boundaries"),
      getEarthquakeFeed(),
      request<MapLayers>("/api/map-layers"),
    ]);
    return [plates, boundaries, earthquakes, mapLayers] as const;
  });
}
