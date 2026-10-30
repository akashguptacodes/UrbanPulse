from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "priority_service"
    assert data["version"] == settings.VERSION
    assert data["rule_version"] == settings.RULES_VERSION
    assert data["assessment_method"] == "RULE_BASED_BASELINE"


def test_assess_endpoint_valid_request():
    payload = {
        "complaint_id": "test-comp-1",
        "primary_category": "POTHOLES",
        "title": "Severe crater on road",
        "description": "Deep crater near hospital with traffic blocked.",
        "latitude": 12.9716,
        "longitude": 77.5946,
    }
    response = client.post("/api/v1/priority/assess", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["complaint_id"] == "test-comp-1"
    assert "severity_score" in data
    assert 0.0 <= data["severity_score"] <= 100.0
    assert data["priority_level"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
    assert "score_breakdown" in data
    assert data["assessment_method"] == "RULE_BASED_BASELINE"
    assert "limitations" in data


def test_assess_endpoint_empty_description():
    payload = {
        "primary_category": "GARBAGE",
        "title": "Full trash bin",
        "description": "",
    }
    response = client.post("/api/v1/priority/assess", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["severity_score"] == 15.0
    assert data["priority_level"] == "LOW"


def test_assess_endpoint_invalid_category_422():
    payload = {
        "primary_category": "INVALID_CAT",
        "title": "Bad request",
        "description": "Testing invalid category",
    }
    response = client.post("/api/v1/priority/assess", json=payload)
    assert response.status_code == 422


def test_assess_endpoint_inconsistent_disaster_subtype_422():
    payload = {
        "primary_category": "POTHOLES",
        "disaster_type": "FIRE",  # Inconsistent: FIRE on POTHOLES
        "title": "Pothole",
        "description": "Hole on road",
    }
    response = client.post("/api/v1/priority/assess", json=payload)
    assert response.status_code == 422


def test_assess_endpoint_oversized_description_422():
    payload = {
        "primary_category": "GARBAGE",
        "title": "Garbage",
        "description": "X" * 5005,  # Exceeds max length
    }
    response = client.post("/api/v1/priority/assess", json=payload)
    assert response.status_code == 422

