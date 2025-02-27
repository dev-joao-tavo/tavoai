
from sanic.response import text
from sanic import Sanic
app = Sanic.get_app()



@app.route("/")
async def index(request):
    return text("Up and running")

