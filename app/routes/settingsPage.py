from sanic import Sanic, json
from sanic.response import text
from sanic.exceptions import NotFound
from datetime import datetime

app = Sanic()

# Mock function to get user_id from Bearer token (replace with your actual implementation)
def get_user_id_from_token(request):
    # Example: Extract user_id from token
    token = request.token
    # Decode token and get user_id (this is just a mock)
    return 1  # Replace with actual user_id

# GET /messages - Fetch all messages for the user
@app.get("/messages")
async def get_messages(request):
    user_id = get_user_id_from_token(request)
    
    # Mock database query (replace with actual database query)
    messages = [
        {"id": 1, "status": "day-1", "message": "Welcome to day 1!"},
        {"id": 2, "status": "day-1", "message": "Don't forget to hydrate!"},
        {"id": 3, "status": "day-1", "message": "You're doing great!"},
        # Add more mock data as needed
    ]
    
    return json(messages)

# PUT /messages - Update messages for the user
@app.put("/messages")
async def update_messages(request):
    user_id = get_user_id_from_token(request)
    updated_messages = request.json  # List of messages to update
    
    # Mock database update (replace with actual database update)
    for message in updated_messages:
        print(f"Updating message {message['id']} for user {user_id}: {message['message']}")
    
    return json({"message": "Messages updated successfully!"})
