import os
from dotenv import load_dotenv

load_dotenv()


def required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} must be configured before this feature is used")
    return value


def database_url() -> str:
    return os.getenv("DATABASE_URL", "sqlite:///./homista.db")
