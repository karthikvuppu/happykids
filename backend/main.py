import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import Base, engine
from app.routes import auth, patients, admissions, rooms, pharmacy

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

# Add new columns if they don't exist (safe migration)
from sqlalchemy import text
with engine.connect() as conn:
    for col, typedef in [("batch_number", "VARCHAR"), ("expiry_date", "TIMESTAMP")]:
        try:
            conn.execute(text(f"ALTER TABLE drugs ADD COLUMN IF NOT EXISTS {col} {typedef}"))
            conn.commit()
        except Exception:
            conn.rollback()

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Hospital In-Patient Management System API"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}\n{traceback.format_exc()}")
    return JSONResponse(status_code=500, content={"detail": str(exc)})

# Include routers
app.include_router(auth.router)
app.include_router(patients.router, prefix=settings.API_V1_STR)
app.include_router(admissions.router, prefix=settings.API_V1_STR)
app.include_router(rooms.router, prefix=settings.API_V1_STR)
app.include_router(pharmacy.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    """Health check endpoint"""
    return {
        "message": "Hospital In-Patient Management System API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    """Health check"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
