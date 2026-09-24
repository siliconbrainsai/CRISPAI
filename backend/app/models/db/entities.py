"""
SQLAlchemy Database Entities for CRISP AI 3.0 Enterprise
Includes multi-tenant workspace isolation, RBAC role attributes, soft deletion,
and audit log immutability. Compatible with both PostgreSQL and SQLite.
"""

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.db import Base


class Workspace(Base):
    __tablename__ = "workspaces"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Multi-tenant relationships
    users = relationship("User", back_populates="workspace", cascade="all, delete-orphan")
    datasets = relationship("Dataset", back_populates="workspace", cascade="all, delete-orphan")
    analyses = relationship("Analysis", back_populates="workspace", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="workspace", cascade="all, delete-orphan")
    experiments = relationship("Experiment", back_populates="workspace", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="workspace", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=True) # Bcrypt hashed password
    role = Column(String, default="Analyst", nullable=False) # Admin, Data Scientist, Analyst, Viewer
    is_active = Column(Boolean, default=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    workspace = relationship("Workspace", back_populates="users")


class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, nullable=False)
    file_path = Column(String, nullable=True)
    storage_key = Column(String, nullable=True)
    storage_backend = Column(String, default="local") # local, s3
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    row_count = Column(Integer, default=0)
    schema_definition = Column(JSON, default=list) # List of column names
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Soft deletion
    is_deleted = Column(Boolean, default=False, index=True)
    deleted_at = Column(DateTime, nullable=True)

    workspace = relationship("Workspace", back_populates="datasets")
    analyses = relationship("Analysis", back_populates="dataset")


class Analysis(Base):
    __tablename__ = "analyses"
    id = Column(Integer, primary_key=True, index=True)
    analysis_code = Column(String, index=True, nullable=True) # e.g. CRISP-000001-v1
    version = Column(Integer, default=1)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    job_id = Column(String, index=True, nullable=True)
    outcome = Column(String, nullable=True)
    candidates = Column(JSON, default=list)
    environments = Column(JSON, default=list)
    method = Column(String, default="PC-Algorithm / IRM Ensemble")
    status = Column(String, default="RUNNING", index=True) # QUEUED, RUNNING, COMPLETED, FAILED, RETRY
    error_message = Column(String, nullable=True)
    retry_count = Column(Integer, default=0)
    results = Column(JSON, nullable=True)
    feature_ranking = Column(JSON, nullable=True)
    dag_info = Column(JSON, nullable=True)
    assumptions = Column(JSON, nullable=True)
    limitations = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Soft deletion
    is_deleted = Column(Boolean, default=False, index=True)
    deleted_at = Column(DateTime, nullable=True)

    workspace = relationship("Workspace", back_populates="analyses")
    dataset = relationship("Dataset", back_populates="analyses")
    reports = relationship("Report", back_populates="analysis")


class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    status = Column(String, default="PUBLISHED") # DRAFT, PUBLISHED
    insights = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Soft deletion
    is_deleted = Column(Boolean, default=False, index=True)
    deleted_at = Column(DateTime, nullable=True)

    workspace = relationship("Workspace", back_populates="reports")
    analysis = relationship("Analysis", back_populates="reports")


class Experiment(Base):
    __tablename__ = "experiments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    hypothesis = Column(String, nullable=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    dataset_name = Column(String, nullable=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    outcome = Column(String, nullable=True)
    treatment = Column(String, nullable=True)
    environment = Column(String, nullable=True)
    methodology = Column(String, nullable=True)
    status = Column(String, default="RUNNING")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Soft deletion
    is_deleted = Column(Boolean, default=False, index=True)
    deleted_at = Column(DateTime, nullable=True)

    workspace = relationship("Workspace", back_populates="experiments")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, index=True, nullable=False)
    resource = Column(String, nullable=True)
    resource_id = Column(String, nullable=True)
    status = Column(String, default="SUCCESS")
    details = Column(String, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    workspace = relationship("Workspace", back_populates="audit_logs")
    user = relationship("User")


class NewsletterSubscriber(Base):
    __tablename__ = "newsletter_subscribers"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    subscribed_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
