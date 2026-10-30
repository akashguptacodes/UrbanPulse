from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_evaluate_endpoint_success():
    payload = {
        "target_complaint": {
            "id": "target-101",
            "title": "Severe pothole on main road",
            "description": "Deep asphalt crater causing traffic slowdown",
            "category": "POTHOLES",
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
        "candidate_pool": [
            {
                "id": "cand-201",
                "title": "Severe pothole on main road",
                "description": "Deep asphalt crater causing traffic slowdown",
                "category": "POTHOLES",
                "latitude": 12.9716,
                "longitude": 77.5946,
            },
            {
                "id": "cand-202",
                "title": "Street light flickering constantly",
                "description": "Pole 43 dark at night",
                "category": "STREET_LIGHTS",
                "latitude": 12.9716,
                "longitude": 77.5946,
            },
        ],
    }

    response = client.post("/api/v1/duplicates/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["target_id"] == "target-101"
    assert data["candidates_evaluated"] == 2
    assert len(data["matches"]) == 2
    assert data["top_match"]["candidate_id"] == "cand-201"
    assert data["top_match"]["recommendation"] == "LIKELY_DUPLICATE"
    assert data["top_match"]["combined_score"] >= 0.75

    # Check the second candidate (category mismatch)
    m2 = next(m for m in data["matches"] if m["candidate_id"] == "cand-202")
    assert m2["combined_score"] == 0.0
    assert m2["recommendation"] == "UNLIKELY_DUPLICATE"


def test_check_alias_endpoint():
    payload = {
        "target_complaint": {
            "id": "t-1",
            "title": "Pothole",
            "category": "POTHOLES",
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
        "candidate_pool": [],
    }
    response = client.post("/api/v1/duplicates/check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["target_id"] == "t-1"
    assert data["candidates_evaluated"] == 0
    assert data["matches"] == []
    assert data["top_match"] is None


def test_validation_invalid_latitude():
    payload = {
        "target_complaint": {
            "id": "t-err",
            "title": "Invalid Lat",
            "category": "POTHOLES",
            "latitude": 95.0,  # Invalid latitude > 90
            "longitude": 77.5946,
        },
        "candidate_pool": [],
    }
    response = client.post("/api/v1/duplicates/evaluate", json=payload)
    assert response.status_code == 422


def test_validation_empty_title():
    payload = {
        "target_complaint": {
            "id": "t-empty",
            "title": "   ",
            "category": "POTHOLES",
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
        "candidate_pool": [],
    }
    response = client.post("/api/v1/duplicates/evaluate", json=payload)
    assert response.status_code == 422


def test_validation_pool_exceeds_limit():
    candidates = [
        {
            "id": f"c-{i}",
            "title": f"Candidate {i}",
            "category": "POTHOLES",
            "latitude": 12.9716,
            "longitude": 77.5946,
        }
        for i in range(105)
    ]
    payload = {
        "target_complaint": {
            "id": "t-1",
            "title": "Test limit",
            "category": "POTHOLES",
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
        "candidate_pool": candidates,
    }
    response = client.post("/api/v1/duplicates/evaluate", json=payload)
    assert response.status_code == 422

