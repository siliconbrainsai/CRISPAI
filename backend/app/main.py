import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import upload, pipeline, results, predict

app = FastAPI(title="CRISP Causal Backend", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["pipeline"])
app.include_router(results.router, prefix="/api/pipeline/results", tags=["results"])
app.include_router(predict.router, prefix="/api/inference/predict", tags=["predict"])

@app.get("/")
def read_root():
    return {"message": "Welcome to CRISP Causal Feature Selection API"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
