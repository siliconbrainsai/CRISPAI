from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any
from datetime import datetime

# --- Auth & Security Schemas ---
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    name: str
    password: str
    role: Optional[str] = "Analyst"
    workspace_name: Optional[str] = None
    workspace_id: Optional[int] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    name: str
    role: str
    workspace_id: int
    workspace_name: Optional[str] = None

class TokenPayload(BaseModel):
    sub: str # user_id string
    email: str
    role: str
    workspace_id: int
    exp: Optional[int] = None


# --- Workspace Schemas ---
class WorkspaceBase(BaseModel):
    name: str

class WorkspaceCreate(WorkspaceBase):
    pass

class Workspace(WorkspaceBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# --- User Schemas ---
class UserBase(BaseModel):
    email: str
    name: str
    role: str = "Analyst"

class UserCreate(UserBase):
    password: str
    workspace_id: Optional[int] = None

class User(UserBase):
    id: int
    workspace_id: Optional[int] = None
    is_active: bool = True
    created_at: datetime
    class Config:
        from_attributes = True


# --- Dataset Schemas ---
class DatasetBase(BaseModel):
    filename: str
    row_count: int = 0
    schema_definition: List[Any] = []
    file_path: Optional[str] = None
    storage_key: Optional[str] = None
    storage_backend: Optional[str] = "local"

class DatasetCreate(DatasetBase):
    workspace_id: Optional[int] = None

class Dataset(DatasetBase):
    id: int
    workspace_id: Optional[int] = None
    created_by_user_id: Optional[int] = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True


# --- Analysis Schemas ---
class AnalysisBase(BaseModel):
    analysis_code: Optional[str] = None
    version: Optional[int] = 1
    dataset_id: Optional[int] = None
    outcome: Optional[str] = None
    candidates: Optional[List[str]] = []
    environments: Optional[List[str]] = []
    method: Optional[str] = "PC-Algorithm / IRM Ensemble"

class AnalysisCreate(AnalysisBase):
    workspace_id: Optional[int] = None

class AnalysisUpdate(BaseModel):
    status: Optional[str] = None
    results: Optional[Any] = None
    feature_ranking: Optional[Any] = None
    dag_info: Optional[Any] = None
    assumptions: Optional[Any] = None
    limitations: Optional[Any] = None
    analysis_code: Optional[str] = None
    version: Optional[int] = None
    error_message: Optional[str] = None
    completed_at: Optional[datetime] = None

class Analysis(AnalysisBase):
    id: int
    workspace_id: Optional[int] = None
    created_by_user_id: Optional[int] = None
    job_id: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    retry_count: int = 0
    results: Optional[Any] = None
    feature_ranking: Optional[Any] = None
    dag_info: Optional[Any] = None
    assumptions: Optional[Any] = None
    limitations: Optional[Any] = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# --- Report Schemas ---
class ReportBase(BaseModel):
    title: str
    analysis_id: Optional[int] = None
    dataset_id: Optional[int] = None
    status: Optional[str] = "PUBLISHED"
    insights: Optional[Any] = None

class ReportCreate(ReportBase):
    workspace_id: Optional[int] = None

class Report(ReportBase):
    id: int
    workspace_id: Optional[int] = None
    created_by_user_id: Optional[int] = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True


# --- Experiment Schemas ---
class ExperimentBase(BaseModel):
    name: str
    hypothesis: Optional[str] = None
    dataset_name: Optional[str] = None
    dataset_id: Optional[int] = None
    outcome: Optional[str] = None
    treatment: Optional[str] = None
    environment: Optional[str] = None
    methodology: Optional[str] = None
    status: Optional[str] = "RUNNING"

class ExperimentCreate(ExperimentBase):
    workspace_id: Optional[int] = None

class Experiment(ExperimentBase):
    id: int
    workspace_id: Optional[int] = None
    created_by_user_id: Optional[int] = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# --- Audit Log Schemas ---
class AuditLogBase(BaseModel):
    action: str
    resource: Optional[str] = None
    resource_id: Optional[str] = None
    status: Optional[str] = "SUCCESS"
    details: Optional[str] = None
    metadata_json: Optional[Any] = None

class AuditLogCreate(AuditLogBase):
    workspace_id: Optional[int] = None
    user_id: Optional[int] = None

class AuditLog(AuditLogBase):
    id: int
    workspace_id: Optional[int] = None
    user_id: Optional[int] = None
    timestamp: datetime
    class Config:
        from_attributes = True
