"""Prepare geological data for the API and the WebGL client.

The MVP stores a curated, lightweight data model in ``data/processed``. When
authoritative GeoJSON is added, this command is the single place to perform
coordinate validation, simplify shapes, compute equal-area measurements, and
derive adjacency with GeoPandas/Shapely.
"""

from __future__ import annotations

import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
RAW = ROOT / "data" / "raw"


def validate_coordinates(coordinates: list[list[float]]) -> None:
    for latitude, longitude in coordinates:
        if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
            raise ValueError(f"Invalid coordinate: {(latitude, longitude)}")


def simplify_path(path: list[list[float]], max_points: int = 80) -> list[list[float]]:
    """Retain enough points to recognize a coast/boundary without overloading WebGL."""
    if len(path) <= max_points:
        return path
    stride = math.ceil((len(path) - 1) / (max_points - 1))
    simplified = path[::stride]
    if simplified[-1] != path[-1]:
        simplified.append(path[-1])
    return simplified


def to_lat_lng(path: list[list[float]]) -> list[list[float]]:
    return [[round(latitude, 4), round(longitude, 4)] for longitude, latitude, *_ in path]


def build_map_layers() -> dict[str, list]:
    land_source = json.loads((RAW / "ne_110m_land.geojson").read_text())
    boundary_source = json.loads((RAW / "pb2002_boundaries.geojson").read_text())
    land: list[list[list[float]]] = []

    for feature in land_source["features"]:
        geometry = feature["geometry"]
        polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
        for polygon in polygons:
            # The exterior ring is enough for a lightweight globe basemap.
            land.append(simplify_path(to_lat_lng(polygon[0]), max_points=100))

    plate_boundaries = []
    for index, feature in enumerate(boundary_source["features"]):
        properties = feature.get("properties") or {}
        plate_boundaries.append(
            {
                "id": f"pb2002-{index}",
                "type": "subduction" if properties.get("Type") == "subduction" else "boundary",
                "coordinates": simplify_path(to_lat_lng(feature["geometry"]["coordinates"]), max_points=90),
            }
        )
    return {"land": land, "plateBoundaries": plate_boundaries}


def main() -> None:
    plates = json.loads((PROCESSED / "plates.json").read_text())
    for plate in plates:
        validate_coordinates(plate["polygon"])
        validate_coordinates([[plate["centroid"]["lat"], plate["centroid"]["lng"]]])
    layers = build_map_layers()
    (PROCESSED / "map_layers.json").write_text(json.dumps(layers, separators=(",", ":")))
    print(f"Validated {len(plates)} plate records and wrote {len(layers['land'])} coastlines / {len(layers['plateBoundaries'])} plate-boundary paths")


if __name__ == "__main__":
    main()
