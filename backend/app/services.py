"""Domain queries over processed geological data.

This is intentionally a service boundary: the source can move from JSON files
to PostGIS without changing FastAPI routes or the client-facing data contract.
"""

from __future__ import annotations

import json
from datetime import UTC, date, datetime, timedelta
from functools import lru_cache
from pathlib import Path

import httpx
from fastapi import HTTPException, status

from .models import Boundary, Earthquake, EarthquakeFeed, MapLayers, PlateDetail, PlateSummary


DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "processed"
USGS_EARTHQUAKE_FEED = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
EARTHQUAKE_CACHE_TTL = timedelta(minutes=1)
_earthquake_cache: EarthquakeFeed | None = None


@lru_cache
def _load(filename: str) -> list[dict]:
    with (DATA_DIR / filename).open() as source:
        return json.load(source)


def list_plates() -> list[PlateSummary]:
    return [PlateSummary.model_validate(plate) for plate in _load("plates.json")]


def get_plate(plate_id: str) -> PlateDetail:
    for plate in _load("plates.json"):
        if plate["id"] == plate_id:
            return PlateDetail.model_validate(plate)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plate not found")


def list_boundaries() -> list[Boundary]:
    return [Boundary.model_validate(boundary) for boundary in _load("boundaries.json")]


def get_boundary(boundary_id: str) -> Boundary:
    for boundary in _load("boundaries.json"):
        if boundary["id"] == boundary_id:
            return Boundary.model_validate(boundary)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Boundary not found")


def get_map_layers() -> MapLayers:
    return MapLayers.model_validate(_load("map_layers.json"))


def _filter_earthquakes(
    events: list[Earthquake],
    min_magnitude: float = 0,
    start_date: date | None = None,
    end_date: date | None = None,
    plate_id: str | None = None,
) -> list[Earthquake]:
    return [
        event
        for event in events
        if event.magnitude >= min_magnitude
        and (start_date is None or event.date >= start_date)
        and (end_date is None or event.date <= end_date)
        and (plate_id is None or event.plateId == plate_id)
    ]


def _nearest_plate_id(latitude: float, longitude: float) -> str | None:
    """Approximate association until full plate polygons support containment."""
    plates = _load("plates.json")
    if not plates:
        return None
    return min(
        plates,
        key=lambda plate: (plate["centroid"]["lat"] - latitude) ** 2
        + (plate["centroid"]["lng"] - longitude) ** 2,
    )["id"]


def _load_usgs_earthquakes() -> EarthquakeFeed:
    global _earthquake_cache
    now = datetime.now(UTC)
    if _earthquake_cache and now - _earthquake_cache.fetchedAt < EARTHQUAKE_CACHE_TTL:
        return _earthquake_cache

    response = httpx.get(USGS_EARTHQUAKE_FEED, timeout=10.0)
    response.raise_for_status()
    events: list[Earthquake] = []
    for feature in response.json().get("features", []):
        properties = feature.get("properties") or {}
        coordinates = (feature.get("geometry") or {}).get("coordinates") or []
        if len(coordinates) < 3 or properties.get("mag") is None or properties.get("time") is None:
            continue
        longitude, latitude, depth_km = coordinates[:3]
        occurred_at = datetime.fromtimestamp(properties["time"] / 1000, tz=UTC)
        events.append(
            Earthquake(
                id=feature["id"],
                place=properties.get("place") or "Unspecified location",
                magnitude=properties["mag"],
                depthKm=max(0, depth_km),
                date=occurred_at.date(),
                occurredAt=occurred_at,
                coordinates=[latitude, longitude],
                plateId=_nearest_plate_id(latitude, longitude),
                source="usgs",
                sourceUrl=properties.get("url"),
            )
        )
    _earthquake_cache = EarthquakeFeed(
        events=events,
        source="usgs",
        fetchedAt=now,
        refreshAfterSeconds=int(EARTHQUAKE_CACHE_TTL.total_seconds()),
    )
    return _earthquake_cache


def get_earthquake_feed(
    min_magnitude: float = 0,
    start_date: date | None = None,
    end_date: date | None = None,
    plate_id: str | None = None,
) -> EarthquakeFeed:
    try:
        feed = _load_usgs_earthquakes()
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        fallback_events = [Earthquake.model_validate(event) for event in _load("earthquakes.json")]
        feed = EarthquakeFeed(
            events=fallback_events,
            source="curated",
            fetchedAt=datetime.now(UTC),
            refreshAfterSeconds=int(EARTHQUAKE_CACHE_TTL.total_seconds()),
        )
    return feed.model_copy(update={
        "events": _filter_earthquakes(feed.events, min_magnitude, start_date, end_date, plate_id),
    })


def list_earthquakes(
    min_magnitude: float = 0,
    start_date: date | None = None,
    end_date: date | None = None,
    plate_id: str | None = None,
) -> list[Earthquake]:
    """Compatibility wrapper for service-level consumers."""
    return get_earthquake_feed(min_magnitude, start_date, end_date, plate_id).events
