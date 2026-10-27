from fastapi import FastAPI
import uvicorn

from app.core.config import settings
from app.api.health import router as health_router

app = FastAPI(
    title="UrbanPulse Priority Assessment Service",
    description="Stateless microservice for evaluating civic complaint severity and calculating priority bands.",
    version=settings.VERSION,
)

# Mount health routes
app.include_router(health_router)


if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
