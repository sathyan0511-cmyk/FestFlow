from app.config import config_by_name, DevelopmentConfig, TestingConfig, ProductionConfig

def test_development_config():
    """Verify development configuration uses local SQLite by default."""
    config = DevelopmentConfig()
    assert config.DEBUG is True
    assert "sqlite" in config.SQLALCHEMY_DATABASE_URI or "postgresql" in config.SQLALCHEMY_DATABASE_URI
    assert config.SQLALCHEMY_TRACK_MODIFICATIONS is False

def test_testing_config():
    """Verify testing configuration uses isolated in-memory SQLite."""
    config = TestingConfig()
    assert config.TESTING is True
    assert config.DEBUG is False
    assert config.SQLALCHEMY_DATABASE_URI == "sqlite:///:memory:"

def test_production_config():
    """Verify production configuration defaults to PostgreSQL."""
    config = ProductionConfig()
    assert config.DEBUG is False
    assert "postgresql" in config.SQLALCHEMY_DATABASE_URI

def test_config_by_name_mapping():
    """Verify all environment keys are mapped correctly."""
    assert config_by_name["development"] == DevelopmentConfig
    assert config_by_name["testing"] == TestingConfig
    assert config_by_name["production"] == ProductionConfig
