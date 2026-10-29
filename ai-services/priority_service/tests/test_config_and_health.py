from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)


def test_settings_loaded():
    assert settings.SERVICE_NAME == "priority_service"
    assert settings.PORT == 8002
    assert settings.ENVIRONMENT == "development"


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "priority_service"
    assert data["version"] == settings.VERSION
    assert data["environment"] == settings.ENVIRONMENT
