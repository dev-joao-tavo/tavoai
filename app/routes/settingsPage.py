from sanic import Sanic, json
from utils.utils import get_user_from_token

app = Sanic()

# GET /messages - Fetch all messages for the user
@app.get("/messages")
async def get_messages(request):
    user_id = get_user_from_token(request)

    
    return json()

# PUT /messages - Update messages for the user
@app.put("/messages")
async def update_messages(request):
    user_id = get_user_from_token(request)
    updated_messages = request.json  

    return json({"message": "Messages updated successfully!"})
