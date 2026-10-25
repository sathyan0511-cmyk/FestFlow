import os
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS

from .config import config_by_name

db = SQLAlchemy()
migrate = Migrate()
cors = CORS()

def create_app(config_name=None):
    """
    Application factory for CampusFix.
    Initializes Flask application, extensions, health endpoint, CLI commands, and error handlers.
    """
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config_by_name.get(config_name, config_by_name["default"]))

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    
    cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
    cors.init_app(app, resources={r"/api/*": {"origins": cors_origins if cors_origins != ["*"] else "*"}})

    # Import models so SQLAlchemy and Alembic register them
    from . import models  # noqa: F401

    # Healthcheck endpoint
    @app.route("/api/health", methods=["GET"])
    def health_check():
        db_status = "connected"
        try:
            with app.app_context():
                # Test connectivity
                db.session.execute(db.text("SELECT 1"))
        except Exception as e:
            db_status = f"unreachable: {str(e)}"

        return jsonify({
            "status": "healthy" if "unreachable" not in db_status else "degraded",
            "service": "CampusFix Maintenance & Incident Prioritisation API",
            "version": "1.0.0",
            "environment": config_name,
            "database": {
                "status": db_status,
                "engine": app.config.get("SQLALCHEMY_DATABASE_URI", "").split("://")[0]
            }
        }), 200

    # Documented database initialization CLI command
    @app.cli.command("init-db")
    def init_db():
        """Initialize the database tables."""
        with app.app_context():
            db.create_all()
            print("CampusFix database tables created successfully.")

    # Standard JSON error handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            "error": "Bad Request",
            "message": getattr(error, "description", str(error))
        }), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "error": "Not Found",
            "message": getattr(error, "description", "The requested resource was not found.")
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            "error": "Internal Server Error",
            "message": "An unexpected server error occurred."
        }), 500

    return app
