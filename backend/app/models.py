from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


BoundaryType = Literal["convergent", "divergent", "transform"]


class Coordinate(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class Velocity(BaseModel):
    magnitude: float = Field(gt=0, description="Centimetres per year")
    direction: str
    bearing: float = Field(ge=0, lt=360)


class PlateSummary(BaseModel):
    id: str
    name: str
    areaMillionKm2: float
    velocity: Velocity
    centroid: Coordinate
    color: str
    summary: str


class PlateDetail(PlateSummary):
    neighbors: list[str]
    polygon: list[list[float]]


class Boundary(BaseModel):
    id: str
    name: str
    type: BoundaryType
    plates: list[str]
    coordinates: list[list[float]]
    description: str


class Earthquake(BaseModel):
    id: str
    place: str
    magnitude: float = Field(ge=0)
    depthKm: float = Field(ge=0)
    date: date
    occurredAt: datetime | None = None
    coordinates: list[float]
    plateId: str | None = None
    source: Literal["usgs", "curated"] = "curated"
    sourceUrl: str | None = None


class EarthquakeFeed(BaseModel):
    events: list[Earthquake]
    source: Literal["usgs", "curated"]
    fetchedAt: datetime
    refreshAfterSeconds: int


class MapBoundaryPath(BaseModel):
    id: str
    type: Literal["boundary", "subduction"]
    coordinates: list[list[float]]


class MapLayers(BaseModel):
    land: list[list[list[float]]]
    plateBoundaries: list[MapBoundaryPath]
