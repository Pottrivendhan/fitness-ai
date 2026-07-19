import asyncio
import os
import sys
from datetime import datetime

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import connect_to_mongo, close_mongo_connection, get_database
from app.services.auth import AuthService
from app.schemas import UserRegisterSchema, UserLoginSchema
from app.config import settings

async def run_test():
    print("Connecting to MongoDB...")
    await connect_to_mongo()
    db = await get_database()
    
    # Check connection
    try:
        await db.client.admin.command('ping')
        print("✓ MongoDB connection verified via ping")
    except Exception as e:
        print(f"✗ MongoDB ping failed: {e}")
        return

    # Clear test users
    email = "test_flow@example.com"
    await db.users.delete_many({"email": email})
    await db.settings.delete_many({"email": email})
    
    auth_service = AuthService(db)
    
    print("\n--- Testing Registration ---")
    reg_data = UserRegisterSchema(
        email=email,
        name="Flow Test User",
        password="Password123",
        confirm_password="Password123"
    )
    
    try:
        reg_result = await auth_service.register(reg_data)
        print("✓ Registration successful!")
        print(f"Result User ID: {reg_result['user']['id']}")
        print(f"Tokens: {list(reg_result['tokens'].keys())}")
    except Exception as e:
        print(f"✗ Registration failed: {e}")
        import traceback
        traceback.print_exc()
        return

    print("\n--- Checking database content ---")
    user_doc = await db.users.find_one({"email": email})
    print(f"User document in DB: {user_doc}")
    
    print("\n--- Testing Login ---")
    login_data = UserLoginSchema(
        email=email,
        password="Password123"
    )
    
    try:
        login_result = await auth_service.login(login_data)
        print("✓ Login successful!")
        print(f"Tokens: {list(login_result['tokens'].keys())}")
    except Exception as e:
        print(f"✗ Login failed: {e}")
        import traceback
        traceback.print_exc()
        
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(run_test())
