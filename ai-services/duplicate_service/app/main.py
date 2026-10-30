from fastapi import FastAPI
import uvicorn

from app.core.config import settings
from app.api.health import router as health_router
from app.api.duplicates import router as duplicates_router

app = FastAPI(
    title="UrbanPulse Duplicate Detection Service",
    description="Stateless microservice for detecting duplicate civic complaints across multi-signal algorithms.",
    version=settings.VERSION,
)

# Mount routes
app.include_router(health_router)
app.include_router(duplicates_router)


if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
