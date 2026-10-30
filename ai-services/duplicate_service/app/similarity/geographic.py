import math
from typing import Optional
from app.core.config import settings
from app.schemas.complaint import ComplaintCategory

EARTH_RADIUS_METERS = 6371000.0


def get_category_horizon(category: ComplaintCategory, override_horizon: Optional[float] = None) -> float:
    """Return the search distance horizon (in meters) for a category or custom override."""
    if override_horizon is not None and override_horizon > 0:
        return float(override_horizon)

    horizons = {
        ComplaintCategory.POTHOLES: settings.HORIZON_POTHOLES,
        ComplaintCategory.STREET_LIGHTS: settings.HORIZON_STREET_LIGHTS,
        ComplaintCategory.GARBAGE: settings.HORIZON_GARBAGE,
        ComplaintCategory.DISASTERS: settings.HORIZON_DISASTERS,
    }
    return horizons.get(category, settings.DEFAULT_SEARCH_RADIUS_METERS)


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on the Earth's surface
    using the Haversine formula in meters.
    Handles identical coordinates, antipodes, and anti-meridian crossing.
    """
    # Identical coordinates check
    if abs(lat1 - lat2) < 1e-9 and abs(lon1 - lon2) < 1e-9:
        return 0.0

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)

    # Normalize longitude difference across international date line (-180 to 180)
    raw_delta_lon = lon2 - lon1
    normalized_delta_lon = ((raw_delta_lon + 180.0) % 360.0) - 180.0
    delta_lambda = math.radians(normalized_delta_lon)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    )

    # Numerical clamping to avoid math domain errors due to floating-point rounding
    a = min(1.0, max(0.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_METERS * c


def calculate_geographic_score(
    distance_meters: float,
    horizon_meters: float,
) -> float:
    """
    Compute normalized linear decay score between 0.0 and 1.0.
    Score is 1.0 at distance 0, decaying linearly to 0.0 at horizon_meters.
    Distances exceeding horizon_meters yield 0.0.
    """
    if horizon_meters <= 0.0:
        return 1.0 if distance_meters == 0.0 else 0.0

    if distance_meters <= 0.0:
        return 1.0

    if distance_meters >= horizon_meters:
        return 0.0

    score = 1.0 - (distance_meters / horizon_meters)
    return round(max(0.0, min(1.0, score)), 4)

