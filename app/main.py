from sanic import Sanic, Websocket
from sanic_ext import Extend
import asyncpg
import os
import json
from datetime import datetime
from dotenv import load_dotenv
import asyncio

load_dotenv()

app = Sanic(__name__)

# Configuration
app.config.REQUEST_TIMEOUT = 3000
app.config.RESPONSE_TIMEOUT = 3000 
app.config.KEEP_ALIVE_TIMEOUT = 3000

Extend(app, config={
    "CORS_ORIGINS": [
        "http://localhost:3000",
        "https://app.tavoai.com", 
        "https://api.tavoai.com",
    ],
    "CORS_SUPPORTS_CREDENTIALS": True,
})

class WebSocketManager:
    def __init__(self):
        self.active_connections = set()
        self.pool = None
        self.conn = None  # Persistent connection for notifications

    async def setup_db(self):
        db_url = os.getenv("DATABASE_URL").replace('postgresql+asyncpg://', 'postgresql://')
        
        # Create connection pool
        self.pool = await asyncpg.create_pool(
            db_url,
            min_size=1,
            max_size=3,
            command_timeout=60
        )
        
        # Maintain a dedicated connection for notifications
        self.conn = await self.pool.acquire()
        await self.conn.add_listener('table_changes', self.handle_notification)
        print("✅ Database listener connected")

    async def handle_notification(self, connection, pid, channel, payload):
        print(f"📦 Received DB notification: {payload}")
        
        # Broadcast the raw payload without parsing
        for ws in list(self.active_connections):
            try:
                if not ws.transport.is_closing():
                    await ws.send(payload)
            except Exception as e:
                print(f"🚨 Error sending to WebSocket: {e}")
                self.active_connections.discard(ws)


    async def cleanup(self):
        if self.conn:
            await self.conn.remove_listener('table_changes', self.handle_notification)
            await self.pool.release(self.conn)
        if self.pool:
            await self.pool.close()

ws_manager = WebSocketManager()

@app.websocket('/ws')
async def feed(request, ws):
    # Add connection to manager
    ws_manager.active_connections.add(ws)
    print(f"🌐 New WebSocket connection (Total: {len(ws_manager.active_connections)})")
    
    try:
        await ws.send(json.dumps({
            "type": "connection",
            "status": "success",
            "timestamp": datetime.utcnow().isoformat()
        }))
        
        # Keep connection alive
        while True:
            # Wait for either message or timeout
            try:
                message = await asyncio.wait_for(ws.recv(), timeout=30)
                print(f"Received client message: {message}")
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                try:
                    await ws.send(json.dumps({"type": "ping"}))
                except:
                    break  # Connection lost
            
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
    finally:
        ws_manager.active_connections.discard(ws)
        print(f"🔌 WebSocket disconnected (Remaining: {len(ws_manager.active_connections)})")
        await ws.close()

@app.listener('before_server_start')
async def setup_db_connection(app, loop):
    try:
        await ws_manager.setup_db()
    except Exception as e:
        print(f"🚨 Failed to setup DB connection: {e}")
        raise

@app.listener('after_server_stop') 
async def cleanup_db_connection(app, loop):
    await ws_manager.cleanup()

# Import routes
from routes.home import *
from routes.sendWhatsAppMessages import *
from routes.cards import *
from routes.others import *
from routes.login import auth_bp
app.blueprint(auth_bp)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)