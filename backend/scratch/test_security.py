import os
import sys

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.security import hash_password, verify_password, create_access_token, verify_token
from app.config import settings

def main():
    print("Testing password hashing and verification...")
    password = "MySecurePassword123"
    hashed = hash_password(password)
    print(f"Hashed: {hashed}")
    
    verified = verify_password(password, hashed)
    print(f"Verification status: {verified}")
    
    print("\nTesting JWT token generation and verification...")
    token_payload = {"sub": "user_id_123", "email": "test@example.com"}
    token = create_access_token(token_payload)
    print(f"Token: {token}")
    
    decoded = verify_token(token)
    print(f"Decoded: {decoded}")

if __name__ == "__main__":
    main()
