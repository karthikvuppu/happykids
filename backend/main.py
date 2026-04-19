import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import Base, engine
from app.routes import auth, patients, admissions, rooms

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

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

@app.get("/app")
def serve_frontend():
    """Serve the frontend HTML"""
    import os
    html_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "test-frontend.html")
    return FileResponse(html_path, media_type="text/html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
