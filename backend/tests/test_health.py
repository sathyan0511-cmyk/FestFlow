import json

def test_health_check_endpoint(client, db_session):
    """Test the GET /api/health endpoint returns 200 and healthy status."""
    response = client.get("/api/health")
    assert response.status_code == 200

    data = response.get_json()
    assert data["status"] == "healthy"
    assert "CampusFix" in data["service"]
    assert data["version"] == "1.0.0"
    assert data["environment"] == "testing"
    assert data["database"]["status"] == "connected"
    assert data["database"]["engine"] == "sqlite"

def test_404_error_handler(client):
    """Test standard JSON error formatting for non-existent endpoints."""
    response = client.get("/api/non-existent-endpoint")
    assert response.status_code == 404
    data = response.get_json()
    assert "error" in data
    assert data["error"] == "Not Found"
