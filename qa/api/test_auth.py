import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import User

TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(bind=TEST_ENGINE, autoflush=False, expire_on_commit=False)


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch):
    Base.metadata.create_all(TEST_ENGINE)
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-longer-than-thirty-two-bytes")
    monkeypatch.setenv("JWT_ISSUER", "homista-api")
    monkeypatch.setenv("JWT_AUDIENCE", "homista-mobile")
    def fake_firebase_verify(token: str) -> dict:
        if token == "valid-firebase-token":
            return {"uid": "firebase-user-123", "phone_number": "+919999999999", "name": "Test User"}
        if token == "without-phone":
            return {"uid": "firebase-user-456"}
        raise ValueError("invalid token")

    monkeypatch.setattr("app.routes.verify_firebase_id_token", fake_firebase_verify)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(TEST_ENGINE)


def test_firebase_login_creates_user_and_active_session(client: TestClient) -> None:
    login = client.post("/v1/auth/firebase", json={"id_token": "valid-firebase-token"})

    assert login.status_code == 200
    session = login.json()
    assert session["token_type"] == "bearer"
    assert session["user"]["phone_number"] == "+919999999999"
    headers = {"Authorization": f"Bearer {session['access_token']}"}
    current_user = client.get("/v1/users/me", headers=headers)
    assert current_user.status_code == 200
    assert current_user.json()["display_name"] == "Test User"


def test_logout_revokes_session(client: TestClient) -> None:
    token = client.post("/v1/auth/firebase", json={"id_token": "valid-firebase-token"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    assert client.post("/v1/auth/logout", headers=headers).status_code == 204
    assert client.get("/v1/users/me", headers=headers).status_code == 401


def test_invalid_firebase_token_is_rejected(client: TestClient) -> None:
    response = client.post("/v1/auth/firebase", json={"id_token": "invalid"})

    assert response.status_code == 401
    assert client.get("/v1/users/me").status_code == 401


def test_firebase_identity_without_phone_number_is_rejected(client: TestClient) -> None:
    response = client.post("/v1/auth/firebase", json={"id_token": "without-phone"})

    assert response.status_code == 401
