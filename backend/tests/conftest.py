import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

# In-memory SQLite for tests (fast, isolated, no cleanup needed)
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def db_session():
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def sample_pdf_bytes():
    """Minimal valid PDF for upload testing."""
    return (
        b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n"
        b"xref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n"
        b"0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\n"
        b"startxref\n115\n%%EOF"
    )


@pytest.fixture
def upload_dir(tmp_path):
    upload_path = str(tmp_path / "uploads")
    os.makedirs(upload_path, exist_ok=True)
    os.environ["UPLOAD_DIR"] = upload_path
    return upload_path
