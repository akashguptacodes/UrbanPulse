from fastapi import FastAPI
import uvicorn

from app.core.config import settings
from app.api.health import router as health_router
from app.api.priority import router as priority_router

app = FastAPI(
    title="UrbanPulse Priority Assessment Service",
    description="Stateless decision-support microservice for evaluating civic complaint severity and calculating priority levels.",
    version=settings.VERSION,
)

# Mount routes
app.include_router(health_router)
app.include_router(priority_router)


if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
