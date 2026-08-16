from fastapi.testclient import TestClient

from app import services
from app.main import app
from app.models import Earthquake, EarthquakeFeed


client = TestClient(app)


def test_list_plates_returns_plate_summaries() -> None:
    response = client.get("/api/plates")
    assert response.status_code == 200
    assert any(plate["id"] == "indian" for plate in response.json())
    assert "polygon" not in response.json()[0]


def test_plate_detail_includes_geometric_data() -> None:
    response = client.get("/api/plates/indian")
    assert response.status_code == 200
    assert response.json()["velocity"]["direction"] == "NNE"
    assert len(response.json()["polygon"]) > 3


def test_earthquake_endpoint_returns_live_feed_contract(monkeypatch) -> None:
    live_event = Earthquake(
        id="usgs-test-event",
        place="Test location",
        magnitude=6.2,
        depthKm=42,
        date="2026-08-16",
        coordinates=[20, 80],
        source="usgs",
    )
    monkeypatch.setattr(
        services,
        "_load_usgs_earthquakes",
        lambda: EarthquakeFeed(events=[live_event], source="usgs", fetchedAt="2026-08-16T00:00:00Z", refreshAfterSeconds=60),
    )
    response = client.get("/api/earthquakes?min_magnitude=6")
    assert response.status_code == 200
    assert response.json()["source"] == "usgs"
    assert response.json()["events"][0]["id"] == "usgs-test-event"


def test_cors_allows_localhost_and_loopback_frontends() -> None:
    for origin in ("http://localhost:3000", "http://127.0.0.1:3000"):
        response = client.options(
            "/api/plates",
            headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
        )
        assert response.headers["access-control-allow-origin"] == origin
