from flask import Flask
from flask_cors import CORS
import os

# Importiere die Blueprints
from job_routes import job_bp

app = Flask(__name__)

# CORS-Konfiguration (erlaube Anfragen vom Frontend)
# Für Entwicklung kannst du es breit erlauben, für Produktion spezifischer konfigurieren.
CORS(app, resources={r"/api/*": {"origins": "*"}}) # Erlaube alle Origins für /api/*

# Registriere die Blueprints
app.register_blueprint(job_bp, url_prefix='/api/jobs')

@app.route('/')
def index():
    return "DXF2TMS Python Backend is running!"

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3001)) # Backend Port
    app.run(debug=True, host='0.0.0.0', port=port)
