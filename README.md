# Tectonica

An interactive, educational globe for exploring tectonic plates, their motion, boundaries, and the geological phenomena they create.

## Stack

- **Frontend:** Next.js, TypeScript, React Three Fiber, Three.js, Tailwind CSS
- **Backend:** Python, FastAPI, Pydantic
- **Data:** GeoJSON-ready JSON datasets, with a processing pipeline designed for GeoPandas/Shapely as the project grows

## Run locally

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The frontend expects the API at `http://localhost:8000` by default; override it with `NEXT_PUBLIC_API_URL`.

## Architecture

```text
Curated geological datasets
          |
          v
Python processing scripts  -->  processed JSON (GeoJSON-ready)
          |
          v
FastAPI domain API  -->  Next.js / React Three Fiber  -->  Interactive globe
```

The initial dataset is intentionally curated for product exploration. It establishes the data contracts and interaction model before we introduce authoritative full-resolution plate geometry and live event feeds.

## Current MVP

- Interactive 3D Earth with orbit controls
- Major plate outlines, selection, motion vectors, and neighboring plates
- Distinct convergent, divergent, and transform boundary treatments
- Guided exploration of five geological regions
- Earthquake layer with magnitude and event details
- Responsive information panel and keyboard-accessible controls

## Project structure

```text
frontend/       Next.js visual experience
backend/        FastAPI domain API and geospatial services
data/
  raw/          Source datasets (to be added)
  processed/    Frontend/API-ready curated datasets
scripts/        Repeatable data processing commands
```

## Next steps

1. Replace the curated plate coordinates with an authoritative GeoJSON source.
2. Add a GeoPandas/Shapely processing step for area, adjacency, and boundary derivation.
3. Add USGS earthquake ingestion and cache daily events.
4. Move high-volume event queries to PostGIS.
5. Build the guided “Why?” boundary animations and geological-time mode.
