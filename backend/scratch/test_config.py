import os
import sys
import json
from typing import List, Any

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from pydantic import field_validator
from pydantic_settings import BaseSettings

class TestSettings(BaseSettings):
    CORS_ORIGINS: Any = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://fitness-o3vb.vercel.app",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed]
                except Exception:
                    pass
            return [item.strip() for item in v.split(",") if item.strip()]
        elif isinstance(v, list):
            return [str(item).strip() for item in v if str(item).strip()]
        return v

def main():
    # Test case 1: Comma-separated string with whitespaces
    os.environ["CORS_ORIGINS"] = "http://localhost:5173,  https://fitness-o3vb.vercel.app  , http://localhost:3000"
    settings = TestSettings()
    print("Parsed origins:")
    for origin in settings.CORS_ORIGINS:
        print(f"  '{origin}'")
        
    # Test case 2: JSON list
    os.environ["CORS_ORIGINS"] = '["http://localhost:5173", "https://fitness-o3vb.vercel.app"]'
    settings = TestSettings()
    print("Parsed JSON origins:")
    for origin in settings.CORS_ORIGINS:
        print(f"  '{origin}'")

if __name__ == "__main__":
    main()
