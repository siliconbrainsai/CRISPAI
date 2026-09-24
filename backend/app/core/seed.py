"""
Initial Database Seeding for CRISP AI 3.0 Enterprise
Seeds default workspace, test admin and data scientist accounts, and sample dataset.
"""

from app.core.db import SessionLocal
from app.core.security import hash_password, Role
from app.models.db.entities import User, Workspace, Dataset
from datetime import datetime


def seed_database():
    """Seeds default accounts if they do not exist."""
    db = SessionLocal()
    try:
        # 1. Seed or retrieve default enterprise workspace
        workspace = db.query(Workspace).filter(Workspace.name == "SiliconBrain Enterprise").first()
        if not workspace:
            workspace = Workspace(name="SiliconBrain Enterprise")
            db.add(workspace)
            db.commit()
            db.refresh(workspace)

        # 2. Seed Admin User
        admin_user = db.query(User).filter(User.email == "admin@crisp.ai").first()
        if not admin_user:
            admin_user = User(
                email="admin@crisp.ai",
                name="CRISP System Administrator",
                password_hash=hash_password("AdminPassword123!"),
                role=Role.ADMIN,
                workspace_id=workspace.id,
                is_active=True
            )
            db.add(admin_user)

        # 3. Seed Data Scientist User
        scientist_user = db.query(User).filter(User.email == "analyst@siliconbrain.ai").first()
        if not scientist_user:
            scientist_user = User(
                email="analyst@siliconbrain.ai",
                name="Lead Causal Scientist",
                password_hash=hash_password("Admin123!"),
                role=Role.DATA_SCIENTIST,
                workspace_id=workspace.id,
                is_active=True
            )
            db.add(scientist_user)

        # 4. Seed Sample Dataset
        sample_ds = db.query(Dataset).filter(Dataset.filename == "Clinical_Trial_Phase3_Biomarkers.csv").first()
        if not sample_ds:
            sample_ds = Dataset(
                filename="Clinical_Trial_Phase3_Biomarkers.csv",
                file_path=None,
                storage_backend="local",
                workspace_id=workspace.id,
                row_count=1420,
                schema_definition=[
                    "patient_id", "dosage_mg", "age", "bmi", 
                    "biomarker_alpha", "treatment_group", "cardiac_event", "efficacy_score"
                ],
                is_deleted=False
            )
            db.add(sample_ds)

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[SEED] Warning during database seeding: {e}")
    finally:
        db.close()
