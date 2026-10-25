import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

class Config:
    """Base application configuration."""
    SECRET_KEY = os.getenv("SECRET_KEY", "campusfix-dev-insecure-secret-key-2026")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    PROPAGATE_EXCEPTIONS = True
    JSON_SORT_KEYS = False

class DevelopmentConfig(Config):
    """Development configuration with database fallback to local SQLite."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(BASE_DIR, 'campusfix_dev.db')}"
    )

class TestingConfig(Config):
    """Testing configuration with isolated SQLite in-memory database."""
    TESTING = True
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "TEST_DATABASE_URL",
        "sqlite:///:memory:"
    )

class ProductionConfig(Config):
    """Production configuration for PostgreSQL deployment."""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://campusfix_user:campusfix_secure_pass_2026@localhost:5432/campusfix"
    )

config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig
}
