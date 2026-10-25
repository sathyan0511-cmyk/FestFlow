import os
from app import create_app, db

app = create_app(os.getenv("FLASK_ENV", "development"))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    with app.app_context():
        # Ensure tables exist in development SQLite mode
        db.create_all()
    print(f"Starting CampusFix Backend Server on http://{host}:{port}")
    app.run(host=host, port=port, debug=app.config.get("DEBUG", False))
