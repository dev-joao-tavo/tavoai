# tests/test_api.py
import pytest
from sanic import Sanic
from sanic.response import json
from app.main import app  # Make sure to import your Sanic app

@pytest.fixture
def client():
    return app.test_client

def test_index(client):
    request, response = client.get('/')
    assert response.status == 200
    assert 'Welcome!!' in response.text  # Replace with your actual response logic
