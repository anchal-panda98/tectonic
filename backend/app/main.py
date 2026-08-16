from __future__ import annotations

from datetime import date

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .models import Boundary, EarthquakeFeed, MapLayers, PlateDetail, PlateSummary
from .services import get_boundary, get_earthquake_feed, get_map_layers, get_plate, list_boundaries, list_plates


app = FastAPI(
    title="Tectonica API",
    version="0.1.0",
    description="A domain API for plate tectonics exploration and geospatial data processing.",
)

app.add_middleware(
    CORSMiddleware,
    # Next.js may use either hostname in local development. Keep this explicit
    # rather than opening CORS to arbitrary origins.
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/plates", response_model=list[PlateSummary])
def plates() -> list[PlateSummary]:
    return list_plates()


@app.get("/api/plates/{plate_id}", response_model=PlateDetail)
def plate(plate_id: str) -> PlateDetail:
    return get_plate(plate_id)


@app.get("/api/boundaries", response_model=list[Boundary])
def boundaries() -> list[Boundary]:
    return list_boundaries()


@app.get("/api/boundaries/{boundary_id}", response_model=Boundary)
def boundary(boundary_id: str) -> Boundary:
    return get_boundary(boundary_id)


@app.get("/api/map-layers", response_model=MapLayers)
def map_layers() -> MapLayers:
    return get_map_layers()


@app.get("/api/earthquakes", response_model=EarthquakeFeed)
def earthquakes(
    min_magnitude: float = Query(default=0, ge=0, le=10),
    start_date: date | None = None,
    end_date: date | None = None,
    plate_id: str | None = None,
) -> EarthquakeFeed:
    return get_earthquake_feed(min_magnitude, start_date, end_date, plate_id)
