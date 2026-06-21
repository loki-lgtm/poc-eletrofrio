"""Router: health check simples da aplicação."""
from fastapi import APIRouter

router = APIRouter(tags=["Saúde"])


@router.get("/saude")
async def health_check():
    return {"status": "online", "servicos": ["FastAPI", "IsolationForest", "Ollama Llama3.2"]}
