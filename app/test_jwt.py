import jwt

# Example payload
payload = {"user_id": 123}
secret = "your-secret-key"

# Encode the token
token = jwt.encode(payload, secret, algorithm="HS256")
print("Encoded token:", token)

# Decode the token
decoded = jwt.decode(token, secret, algorithms=["HS256"])
print("Decoded token:", decoded)