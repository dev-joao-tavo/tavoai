from sanic import Sanic
from sanic_ext import Extend

app = Sanic(__name__)


# Increase timeouts if necessary
app.config.REQUEST_TIMEOUT = 3000  # Increase the timeout for receiving requests
app.config.RESPONSE_TIMEOUT = 3000  # Increase the timeout for processing the response
app.config.KEEP_ALIVE_TIMEOUT = 3000  # Optional: Increase the Keep-Alive timeout

Extend(
    app,
    config={
        "CORS_ORIGINS": [
            "http://localhost:3000",       # Local development frontend
            "https://app.tavoai.com",      # Cloudflare Tunnel frontend
            "https://api.tavoai.com",      # Cloudflare Tunnel backend (if needed)
        ],
        "CORS_SUPPORTS_CREDENTIALS": True,  # If authentication is needed
    },
)

# Import routes
from routes.home import *
from routes.sendWhatsAppMessages import *
from routes.cards import *
from routes.others import *
from routes.login import auth_bp  # Import the login blueprint
app.blueprint(auth_bp)  # Register authentication routes

if __name__ == "__main__":
    # Run the app with HTTPS enabled
    app.run(host="0.0.0.0", port=8000, debug=True)