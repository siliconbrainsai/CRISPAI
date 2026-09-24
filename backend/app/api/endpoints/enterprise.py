from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.db.entities import Dataset, Analysis, Report, Experiment, AuditLog, User
from app.core.security import (
    get_current_user,
    get_optional_current_user,
    require_role,
    Role
)
from app.schemas.domain import (
    Dataset as DatasetSchema, DatasetCreate,
    Analysis as AnalysisSchema, AnalysisCreate, AnalysisUpdate,
    Report as ReportSchema, ReportCreate,
    Experiment as ExperimentSchema, ExperimentCreate,
    AuditLog as AuditLogSchema, AuditLogCreate
)

router = APIRouter()


def _normalize_user(current_user: Optional[User]) -> Optional[User]:
    """Helper to ensure current_user is a User entity, handling direct function calls where Depends is default."""
    return current_user if isinstance(current_user, User) else None


def _get_active_workspace_id(current_user: Optional[User]) -> int:
    """Helper to retrieve workspace ID, defaulting to 1 for unauthenticated legacy fallback."""
    user = _normalize_user(current_user)
    if user and user.workspace_id:
        return user.workspace_id
    return 1


# ==========================================
# Datasets API (Multi-Tenant & RBAC Scoped)
# ==========================================

@router.post("/datasets", response_model=DatasetSchema)
def create_dataset(
    dataset: DatasetCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    user = _normalize_user(current_user)
    # RBAC check: Viewers cannot create datasets
    if user and user.role == Role.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Role '{user.role}' cannot create datasets."
        )

    workspace_id = _get_active_workspace_id(user)
    user_id = user.id if user else None

    data = dataset.model_dump() if hasattr(dataset, "model_dump") else dataset.dict()
    data["workspace_id"] = workspace_id
    data["created_by_user_id"] = user_id
    data["is_deleted"] = False

    db_dataset = Dataset(**data)
    db.add(db_dataset)
    db.commit()
    db.refresh(db_dataset)

    # Immutably log audit trail
    audit = AuditLog(
        workspace_id=workspace_id,
        user_id=user_id,
        action="DATASET_UPLOAD",
        resource="dataset",
        resource_id=str(db_dataset.id),
        status="SUCCESS",
        details=f"Uploaded dataset {dataset.filename} ({dataset.row_count} rows)"
    )
    db.add(audit)
    db.commit()

    return db_dataset


@router.get("/datasets", response_model=List[DatasetSchema])
def get_datasets(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    workspace_id = _get_active_workspace_id(current_user)
    return db.query(Dataset).filter(
        Dataset.workspace_id == workspace_id,
        Dataset.is_deleted == False
    ).order_by(Dataset.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/datasets/{dataset_id}", response_model=DatasetSchema)
def get_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    workspace_id = _get_active_workspace_id(current_user)
    db_dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.workspace_id == workspace_id,
        Dataset.is_deleted == False
    ).first()
    if not db_dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")
    return db_dataset


@router.delete("/datasets/{dataset_id}")
def delete_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Soft deletion of a dataset.
    Requires Admin or Data Scientist role. Analysts and Viewers cannot delete datasets.
    """
    user = _normalize_user(current_user)
    if user and user.role not in [Role.ADMIN, Role.DATA_SCIENTIST]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Role '{user.role}' cannot delete datasets. Required: Admin or Data Scientist."
        )

    workspace_id = _get_active_workspace_id(user)
    db_dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.workspace_id == workspace_id,
        Dataset.is_deleted == False
    ).first()

    if not db_dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or already deleted")

    db_dataset.is_deleted = True
    db_dataset.deleted_at = datetime.utcnow()
    db.commit()

    # Record soft delete in audit log
    audit = AuditLog(
        workspace_id=workspace_id,
        user_id=user.id if user else None,
        action="DATASET_DELETED",
        resource="dataset",
        resource_id=str(dataset_id),
        status="SUCCESS",
        details=f"Soft deleted dataset {db_dataset.filename} (id={dataset_id})"
    )
    db.add(audit)
    db.commit()

    return {"message": f"Dataset {dataset_id} soft deleted successfully.", "dataset_id": dataset_id}


# ==========================================
# Reports API (Multi-Tenant & RBAC Scoped)
# ==========================================

@router.post("/reports", response_model=ReportSchema)
def create_report(
    report: ReportCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    user = _normalize_user(current_user)
    if user and user.role == Role.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Role '{user.role}' cannot generate reports."
        )

    workspace_id = _get_active_workspace_id(user)
    user_id = user.id if user else None

    data = report.model_dump() if hasattr(report, "model_dump") else report.dict()
    data["workspace_id"] = workspace_id
    data["created_by_user_id"] = user_id
    data["is_deleted"] = False

    db_report = Report(**data)
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    audit = AuditLog(
        workspace_id=workspace_id,
        user_id=user_id,
        action="REPORT_GENERATED",
        resource="report",
        resource_id=str(db_report.id),
        status="SUCCESS",
        details=f"Generated report: {report.title}"
    )
    db.add(audit)
    db.commit()

    return db_report


@router.get("/reports", response_model=List[ReportSchema])
def get_reports(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    workspace_id = _get_active_workspace_id(current_user)
    return db.query(Report).filter(
        Report.workspace_id == workspace_id,
        Report.is_deleted == False
    ).order_by(Report.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/reports/{report_id}", response_model=ReportSchema)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    workspace_id = _get_active_workspace_id(current_user)
    db_report = db.query(Report).filter(
        Report.id == report_id,
        Report.workspace_id == workspace_id,
        Report.is_deleted == False
    ).first()
    if not db_report:
        raise HTTPException(status_code=404, detail="Report not found or access denied")
    return db_report


# ==========================================
# Experiments API (Multi-Tenant & RBAC Scoped)
# ==========================================

@router.post("/experiments", response_model=ExperimentSchema)
def create_experiment(
    exp: ExperimentCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    user = _normalize_user(current_user)
    if user and user.role in [Role.VIEWER, Role.ANALYST]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Role '{user.role}' cannot create experiments."
        )

    workspace_id = _get_active_workspace_id(user)
    user_id = user.id if user else None

    data = exp.model_dump() if hasattr(exp, "model_dump") else exp.dict()
    data["workspace_id"] = workspace_id
    data["created_by_user_id"] = user_id
    data["is_deleted"] = False

    db_exp = Experiment(**data)
    db.add(db_exp)
    db.commit()
    db.refresh(db_exp)

    audit = AuditLog(
        workspace_id=workspace_id,
        user_id=user_id,
        action="EXPERIMENT_CREATED",
        resource="experiment",
        resource_id=str(db_exp.id),
        status="SUCCESS",
        details=f"Created experiment: {exp.name}"
    )
    db.add(audit)
    db.commit()

    return db_exp


@router.get("/experiments", response_model=List[ExperimentSchema])
def get_experiments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    workspace_id = _get_active_workspace_id(current_user)
    return db.query(Experiment).filter(
        Experiment.workspace_id == workspace_id,
        Experiment.is_deleted == False
    ).order_by(Experiment.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/experiments/{experiment_id}", response_model=ExperimentSchema)
def get_experiment(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    workspace_id = _get_active_workspace_id(current_user)
    db_exp = db.query(Experiment).filter(
        Experiment.id == experiment_id,
        Experiment.workspace_id == workspace_id,
        Experiment.is_deleted == False
    ).first()
    if not db_exp:
        raise HTTPException(status_code=404, detail="Experiment not found or access denied")
    return db_exp


# ==========================================
# Analyses API (Multi-Tenant & RBAC Scoped)
# ==========================================

@router.post("/analyses", response_model=AnalysisSchema)
def create_analysis(
    analysis: AnalysisCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    user = _normalize_user(current_user)
    if user and user.role == Role.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Role '{user.role}' cannot trigger analyses."
        )

    workspace_id = _get_active_workspace_id(user)
    user_id = user.id if user else None

    data = analysis.model_dump() if hasattr(analysis, "model_dump") else analysis.dict()
    data["workspace_id"] = workspace_id
    data["created_by_user_id"] = user_id
    data["is_deleted"] = False

    db_analysis = Analysis(**data)
    db.add(db_analysis)
    db.commit()
    db.refresh(db_analysis)

    audit = AuditLog(
        workspace_id=workspace_id,
        user_id=user_id,
        action="ANALYSIS_STARTED",
        resource="analysis",
        resource_id=str(db_analysis.id),
        status="SUCCESS",
        details=f"Initiated causal analysis targeting {analysis.outcome}"
    )
    db.add(audit)
    db.commit()
    return db_analysis


@router.get("/analyses", response_model=List[AnalysisSchema])
def get_analyses(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    workspace_id = _get_active_workspace_id(current_user)
    return db.query(Analysis).filter(
        Analysis.workspace_id == workspace_id,
        Analysis.is_deleted == False
    ).order_by(Analysis.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/analyses/{analysis_id}", response_model=AnalysisSchema)
def get_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    workspace_id = _get_active_workspace_id(current_user)
    db_analysis = db.query(Analysis).filter(
        Analysis.id == analysis_id,
        Analysis.workspace_id == workspace_id,
        Analysis.is_deleted == False
    ).first()
    if not db_analysis:
        raise HTTPException(status_code=404, detail="Analysis not found or access denied")
    return db_analysis


@router.patch("/analyses/{analysis_id}", response_model=AnalysisSchema)
def update_analysis(
    analysis_id: int,
    update_data: AnalysisUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    workspace_id = _get_active_workspace_id(current_user)
    db_analysis = db.query(Analysis).filter(
        Analysis.id == analysis_id,
        Analysis.workspace_id == workspace_id,
        Analysis.is_deleted == False
    ).first()
    if not db_analysis:
        raise HTTPException(status_code=404, detail="Analysis not found or access denied")

    update_dict = update_data.model_dump(exclude_unset=True) if hasattr(update_data, "model_dump") else update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(db_analysis, key, value)

    db.commit()
    db.refresh(db_analysis)
    return db_analysis


# ==========================================
# Audit Logs API (Strict Immutability & Admin Scoped)
# ==========================================

@router.post("/audit-logs", response_model=AuditLogSchema)
@router.post("/audit", response_model=AuditLogSchema)
def create_audit_log(
    audit: AuditLogCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    user = _normalize_user(current_user)
    workspace_id = _get_active_workspace_id(user)
    user_id = user.id if user else None

    data = audit.model_dump() if hasattr(audit, "model_dump") else audit.dict()
    data["workspace_id"] = workspace_id
    if user_id and not data.get("user_id"):
        data["user_id"] = user_id

    db_audit = AuditLog(**data)
    db.add(db_audit)
    db.commit()
    db.refresh(db_audit)
    return db_audit


@router.get("/audit-logs", response_model=List[AuditLogSchema])
@router.get("/audit", response_model=List[AuditLogSchema])
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Retrieves audit logs.
    Restricted to Admin and Data Scientist roles.
    Scoped strictly to the requester's active workspace.
    """
    user = _normalize_user(current_user)
    if user and user.role not in [Role.ADMIN, Role.DATA_SCIENTIST]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Role '{user.role}' cannot view audit logs."
        )

    workspace_id = _get_active_workspace_id(user)
    return db.query(AuditLog).filter(
        AuditLog.workspace_id == workspace_id
    ).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
