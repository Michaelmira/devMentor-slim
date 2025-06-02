"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
import os
import datetime
from flask import Flask, request, jsonify, url_for, send_from_directory
from flask_migrate import Migrate
from flask_swagger import swagger
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from api.utils import APIException, generate_sitemap
from api.models import db
from api.routes import api
from api.admin import setup_admin
from werkzeug.middleware.proxy_fix import ProxyFix
from datetime import timedelta


# from models import Person

ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(
    os.path.realpath(__file__)), '../public/')
app = Flask(__name__)
app.url_map.strict_slashes = False

# Apply ProxyFix for deployments behind a reverse proxy
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Secret key for session management (CRITICAL FOR OAUTH STATE)
app.secret_key = os.getenv("FLASK_SESSION_SECRET_KEY")
if not app.secret_key:
    app.secret_key = "default_flask_session_key_for_dev_pls_change_in_env" # Make sure this is unique and strong if used
    print("WARNING: FLASK_SESSION_SECRET_KEY not set in .env. Using a default, insecure key for session management. THIS IS NOT SECURE FOR PRODUCTION.")

# Session Cookie Settings for cross-site compatibility (e.g., OAuth callbacks)
app.config["SESSION_COOKIE_SAMESITE"] = "None"
app.config["SESSION_COOKIE_SECURE"] = True # Requires HTTPS
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_PATH"] = "/"

# Set SESSION_COOKIE_DOMAIN for *.app.github.dev or similar codespace domains
hostname = os.getenv("BACKEND_URL", "").lower()
if hostname.endswith(".app.github.dev"):
    app.config["SESSION_COOKIE_DOMAIN"] = ".app.github.dev"
    print(f"INFO: Setting SESSION_COOKIE_DOMAIN to .app.github.dev for hostname {hostname}")
elif hostname.endswith(".gitpod.io"):
    # Example for another common cloud IDE
    # Extract the core gitpod.io domain part correctly if needed
    # For simplicity, often just ensuring cookies are not too specific is key
    # For now, we can also try the broader domain for gitpod if applicable
    app.config["SESSION_COOKIE_DOMAIN"] = ".gitpod.io" 
    print(f"INFO: Setting SESSION_COOKIE_DOMAIN to .gitpod.io for hostname {hostname}")
else:
    # If not a known cloud IDE pattern, don't set domain explicitly, 
    # let browser handle default (cookie valid for hostname that set it)
    print(f"INFO: Not explicitly setting SESSION_COOKIE_DOMAIN for hostname: {hostname}")

# JWT Configuration
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")  
if not app.config["JWT_SECRET_KEY"]:
    app.config["JWT_SECRET_KEY"] = "default_jwt_secret_key_for_dev_pls_change_in_env" # Make sure this is unique and strong if used
    print("WARNING: JWT_SECRET_KEY not set in .env. Using a default, insecure key for JWT. THIS IS NOT SECURE FOR PRODUCTION.")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = datetime.timedelta(days=1)
jwt = JWTManager(app)

# CORS Configuration
cors_origins_list = []
frontend_url_env = os.getenv('FRONTEND_URL')
backend_url_env = os.getenv('BACKEND_URL') # Typically your API's own URL

if frontend_url_env:
    cors_origins_list.append(frontend_url_env)
# It's not always necessary to add the backend_url to its own CORS origins unless it also serves frontend assets from a different path/port that needs API access.
# However, if your setup requires it:
if backend_url_env:
    cors_origins_list.append(backend_url_env) 

if not cors_origins_list: # Fallback if neither is set
    cors_origins_list = ["http://localhost:3000", "http://127.0.0.1:3000"] # Sensible defaults for local dev
    print(f"WARNING: FRONTEND_URL and/or BACKEND_URL not set in .env for CORS. Defaulting to: {cors_origins_list}")

CORS(app, resources={r"/api/*": {
    "origins": cors_origins_list,
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"],
    "supports_credentials": True # This handles Access-Control-Allow-Credentials
}})

# database condiguration
db_url = os.getenv("DATABASE_URL")
if db_url is not None:
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace(
        "postgres://", "postgresql://")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)

# add the admin
setup_admin(app)

# Add all endpoints form the API with a "api" prefix
app.register_blueprint(api, url_prefix='/api')

# Handle/serialize errors like a JSON object


@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

# generate sitemap with all your endpoints


@app.route('/')
def sitemap():
    if ENV == "development":
        return generate_sitemap(app)
    return send_from_directory(static_file_dir, 'index.html')

# any other endpoint will try to serve it like a static file
@app.route('/<path:path>', methods=['GET'])
def serve_any_other_file(path):
    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = 'index.html'
    response = send_from_directory(static_file_dir, path)
    response.cache_control.max_age = 0  # avoid cache memory
    return response


# this only runs if `$ python src/main.py` is executed
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=PORT, debug=True)
