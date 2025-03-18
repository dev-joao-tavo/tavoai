from sanic import Sanic, json
from utils.utils import get_user_from_token

app = Sanic()

# GET /messages - Fetch all messages for the user
@app.get("/messages")
async def get_messages(request):
    user_id = get_user_from_token(request)
    
    # Mock database query (replace with actual database query)
    messages = [
        {"id": 1, "status": "day-1", "message": "Welcome to day 1!"},
        {"id": 2, "status": "day-1", "message": "Don't forget to hydrate!"},
        {"id": 3, "status": "day-1", "message": "You're doing great!"},
    ]
    
    return json(messages)

# PUT /messages - Update messages for the user
@app.put("/messages")
async def update_messages(request):
    user_id = get_user_from_token(request)
    updated_messages = request.json  
    
    for message in updated_messages:
        print(f"Updating message {message['id']} for user {user_id}: {message['message']}")
    
    return json({"message": "Messages updated successfully!"})
