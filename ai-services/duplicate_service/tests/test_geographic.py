import pytest
from app.similarity.geographic import (
    calculate_haversine_distance,
    calculate_geographic_score,
    get_category_horizon,
)
from app.schemas.complaint import ComplaintCategory
from app.core.config import settings


def test_identical_coordinates_zero_distance():
    lat, lon = 12.9716, 77.5946
    distance = calculate_haversine_distance(lat, lon, lat, lon)
    assert distance == 0.0
    score = calculate_geographic_score(distance, horizon_meters=100.0)
    assert score == 1.0


def test_haversine_known_distance():
    # Approx 111 km between 1 degree of latitude
    dist = calculate_haversine_distance(0.0, 0.0, 1.0, 0.0)
    assert 110_000 < dist < 112_000


def test_anti_meridian_crossing():
    # Point at +179.99 longitude and -179.99 longitude at equator
    dist = calculate_haversine_distance(0.0, 179.99, 0.0, -179.99)
    # The short way around is 0.02 degrees ≈ 2.22 km
    assert dist < 5_000.0


def test_geographic_decay_score():
    horizon = 100.0
    # At 0m: score 1.0
    assert calculate_geographic_score(0.0, horizon) == 1.0

    # At 50m (halfway): score 0.5
    assert calculate_geographic_score(50.0, horizon) == 0.5

    # At 100m (boundary): score 0.0
    assert calculate_geographic_score(100.0, horizon) == 0.0

    # Beyond horizon: score 0.0
    assert calculate_geographic_score(150.0, horizon) == 0.0


def test_category_horizons():
    assert get_category_horizon(ComplaintCategory.POTHOLES) == settings.HORIZON_POTHOLES == 100.0
    assert get_category_horizon(ComplaintCategory.STREET_LIGHTS) == settings.HORIZON_STREET_LIGHTS == 100.0
    assert get_category_horizon(ComplaintCategory.GARBAGE) == settings.HORIZON_GARBAGE == 150.0
    assert get_category_horizon(ComplaintCategory.DISASTERS) == settings.HORIZON_DISASTERS == 500.0


def test_custom_horizon_override():
    custom = 250.0
    assert get_category_horizon(ComplaintCategory.POTHOLES, override_horizon=custom) == 250.0

