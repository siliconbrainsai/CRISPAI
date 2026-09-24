import io
import os
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from app.core.storage import get_storage_service, StorageServiceException
from app.core.security import get_optional_current_user
from app.models.db.entities import User

router = APIRouter()

class UploadResponse(BaseModel):
    filename: str
    file_path: str
    storage_key: Optional[str] = None
    message: str
    row_count: int = 0
    columns: List[str] = []
    dtypes: Optional[Dict[str, str]] = None
    preview: Optional[List[Dict[str, Any]]] = None

@router.post("/tabular", response_model=UploadResponse)
async def upload_tabular(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    storage = get_storage_service()
    workspace_id = current_user.workspace_id if current_user else 1

    try:
        content = await file.read()
        storage_key, saved_path = storage.save_file(
            workspace_id=workspace_id,
            file_bytes=content,
            filename=file.filename
        )
    except StorageServiceException as sse:
        raise HTTPException(status_code=400, detail=str(sse))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    try:
        # Read with pandas for schema and row count parsing
        if file.filename.lower().endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(content))
        elif file.filename.lower().endswith('.tsv'):
            df = pd.read_csv(io.BytesIO(content), sep='\t')
        elif file.filename.lower().endswith('.parquet'):
            df = pd.read_parquet(io.BytesIO(content))
        else:
            df = pd.read_csv(io.BytesIO(content))
            
        columns = [str(c) for c in df.columns]
        row_count = int(len(df))
        dtypes = {str(col): str(dtype) for col, dtype in df.dtypes.items()}
        # Sanitize NaN/Inf for JSON serialization
        preview_df = df.head(5).fillna("")
        preview = preview_df.to_dict(orient="records")
        
        return UploadResponse(
            filename=file.filename,
            file_path=saved_path,
            storage_key=storage_key,
            message="Tabular data uploaded and parsed successfully.",
            row_count=row_count,
            columns=columns,
            dtypes=dtypes,
            preview=preview
        )
    except Exception as e:
        storage.delete_file(storage_key)
        raise HTTPException(status_code=400, detail=f"Failed to parse tabular data: {str(e)}")

@router.post("/images")
async def upload_images(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    storage = get_storage_service()
    workspace_id = current_user.workspace_id if current_user else 1

    try:
        content = await file.read()
        storage_key, saved_path = storage.save_file(
            workspace_id=workspace_id,
            file_bytes=content,
            filename=file.filename
        )
        return {
            "filename": file.filename,
            "storage_key": storage_key,
            "file_path": saved_path,
            "message": "Image(s) uploaded and metadata verified."
        }
    except StorageServiceException as sse:
        raise HTTPException(status_code=400, detail=str(sse))
