from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)


def test_settings_loaded():
    assert settings.SERVICE_NAME == "duplicate_service"
    assert settings.PORT == 8001
    assert settings.ENVIRONMENT == "development"


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "duplicate_service"
    assert data["version"] == settings.VERSION
    assert data["environment"] == settings.ENVIRONMENT
