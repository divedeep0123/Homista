from datetime import datetime, timedelta, timezone
from uuid import uuid4

import firebase_admin
import jwt
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from app.config import required_env

ACCESS_TOKEN_TTL = timedelta(minutes=30)
ALGORITHM = "HS256"


def verify_firebase_id_token(id_token: str) -> dict:
    project_id = required_env("FIREBASE_PROJECT_ID")
    try:
        firebase_app = firebase_admin.get_app("homista")
    except ValueError:
        firebase_app = firebase_admin.initialize_app(
            credentials.ApplicationDefault(),
            {"projectId": project_id},
            name="homista",
        )
    return firebase_auth.verify_id_token(id_token, app=firebase_app, check_revoked=True)


def issue_access_token(user_id: int) -> tuple[str, str, datetime]:
    secret = required_env("JWT_SECRET")
    if len(secret.encode("utf-8")) < 32:
        raise RuntimeError("JWT_SECRET must contain at least 32 bytes")
    now = datetime.now(timezone.utc)
    expires_at = now + ACCESS_TOKEN_TTL
    session_id = str(uuid4())
    claims = {
        "sub": str(user_id),
        "sid": session_id,
        "iss": required_env("JWT_ISSUER"),
        "aud": required_env("JWT_AUDIENCE"),
        "iat": now,
        "exp": expires_at,
    }
    return jwt.encode(claims, secret, algorithm=ALGORITHM), session_id, expires_at


def decode_access_token(token: str) -> dict:
    return jwt.decode(
        token,
        required_env("JWT_SECRET"),
        algorithms=[ALGORITHM],
        issuer=required_env("JWT_ISSUER"),
        audience=required_env("JWT_AUDIENCE"),
        options={"require": ["sub", "sid", "iss", "aud", "iat", "exp"]},
    )
