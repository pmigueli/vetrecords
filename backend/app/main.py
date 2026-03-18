import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.documents import router as documents_router
from app.api.pets import router as pets_router
from app.api.visits import router as visits_router
from app.database import engine, Base

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="VetRecords API",
    description="Intelligent processing system for veterinary medical records",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    logger.info("VetRecords API started")


app.include_router(documents_router)
app.include_router(pets_router)
app.include_router(visits_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "vetrecords-api"}
