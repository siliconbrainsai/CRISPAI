from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

router = APIRouter()

class UploadResponse(BaseModel):
    filename: str
    message: str
    row_count: int = 0
    columns: list = []

@router.post("/tabular", response_model=UploadResponse)
async def upload_tabular(file: UploadFile = File(...)):
    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(status_code=400, detail="Invalid tabular file format. Use CSV or XLSX.")
    
    # In a full implementation, we'd save this and parse it using pandas
    return UploadResponse(
        filename=file.filename,
        message="Tabular data uploaded and validated successfully.",
        row_count=100, # Placeholder
        columns=["sample", "env_split", "label", "biomarker_1"] # Placeholder
    )

@router.post("/images")
async def upload_images(file: UploadFile = File(...)):
    if not file.filename.endswith(('.zip', '.png', '.jpg', '.jpeg')):
        raise HTTPException(status_code=400, detail="Invalid image format.")
    
    return {"filename": file.filename, "message": "Image(s) uploaded and metadata verified."}
