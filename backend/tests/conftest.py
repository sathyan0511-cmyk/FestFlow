import os
import sys
import pytest

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app, db
from app.models import Incident, DuplicateCluster, IncidentAuditLog

@pytest.fixture(scope="session")
def app():
    """Create application instance configured for testing with in-memory SQLite."""
    test_app = create_app("testing")
    return test_app

@pytest.fixture(scope="function")
def client(app):
    """Test HTTP client fixture."""
    return app.test_client()

@pytest.fixture(scope="function")
def db_session(app):
    """
    Database fixture providing a clean, isolated database for each test.
    Automatically creates all tables before each test and drops them after.
    """
    with app.app_context():
        db.create_all()
        yield db.session
        db.session.remove()
        db.drop_all()
