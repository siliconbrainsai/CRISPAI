import sys
from app.core.db import SessionLocal, engine, Base
from app.models.db.entities import Workspace, User, Dataset, Analysis, Report, Experiment, AuditLog
from app.api.endpoints.enterprise import (
    create_dataset, get_datasets, 
    create_analysis, update_analysis, get_analyses,
    create_report, get_reports, 
    create_experiment, get_experiments,
    create_audit_log, get_audit_logs
)
from app.schemas.domain import (
    DatasetCreate, AnalysisCreate, AnalysisUpdate, 
    ReportCreate, ExperimentCreate, AuditLogCreate
)
from sqlalchemy import text

def run_verification():
    db = SessionLocal()
    print("--- 0. Testing Workspace & User Seeding ---")
    ws = db.query(Workspace).first()
    if not ws:
        ws = Workspace(name="Default Research Lab")
        db.add(ws)
        db.commit()
        db.refresh(ws)
    print(f"Workspace ID: {ws.id}, Name: {ws.name}")

    usr = db.query(User).first()
    if not usr:
        usr = User(email="analyst@siliconbrain.ai", name="Lead Analyst", role="Data Scientist", workspace_id=ws.id)
        db.add(usr)
        db.commit()
        db.refresh(usr)
    print(f"User ID: {usr.id}, Email: {usr.email}")

    print("--- 1. Testing Dataset Creation & Persistence ---")
    ds = db.query(Dataset).first()
    if not ds:
        ds = create_dataset(DatasetCreate(
            filename="patient_biomarkers.csv",
            row_count=100,
            schema_definition=["sample", "env_split", "label", "biomarker_1", "age", "hospital_id"],
            workspace_id=ws.id
        ), db=db)
    print(f"Dataset ID: {ds.id}, Filename: {ds.filename}")

    print("--- 2. Testing Analysis Lifecycle ---")
    an = create_analysis(AnalysisCreate(
        dataset_id=ds.id,
        outcome="label",
        candidates=["biomarker_1", "age"],
        environments=["env_split"],
        method="IRM / ICP Ensemble"
    ), db=db)
    print(f"Created Analysis ID: {an.id}, Status: {an.status}")

    # Complete analysis
    results_payload = {
        "job_id": "job-verified-e2e",
        "causal_features": [
            {"feature": "biomarker_1", "score": 0.95, "is_spurious": False},
            {"feature": "age", "score": 0.88, "is_spurious": False},
            {"feature": "hospital_id", "score": 0.05, "is_spurious": True}
        ],
        "metrics": {"baseline_accuracy": 0.75, "causal_accuracy": 0.82}
    }
    an_completed = update_analysis(an.id, AnalysisUpdate(
        status="COMPLETED",
        results=results_payload,
        feature_ranking=results_payload["causal_features"]
    ), db=db)
    print(f"Updated Analysis ID: {an_completed.id}, Status: {an_completed.status}")

    print("--- 3. Testing Report Generation & Persistence ---")
    rep = create_report(ReportCreate(
        title=f"Causal Report: {ds.filename}",
        analysis_id=an.id,
        dataset_id=ds.id,
        status="PUBLISHED",
        insights=results_payload
    ), db=db)
    print(f"Created Report ID: {rep.id}, Title: {rep.title}")

    print("--- 4. Testing Experiment Creation & Persistence ---")
    exp = create_experiment(ExperimentCreate(
        name="Biomarker Stability Across Sites",
        hypothesis="Biomarker_1 causally regulates label outcome regardless of env_split site shift",
        dataset_name=ds.filename,
        dataset_id=ds.id,
        outcome="label",
        treatment="biomarker_1",
        environment="env_split",
        methodology="Invariant Risk Minimization (IRM)"
    ), db=db)
    print(f"Created Experiment ID: {exp.id}, Name: {exp.name}")

    print("--- 5. Testing Audit Log Traceability ---")
    logs = get_audit_logs(db=db)
    print(f"Total Audit Logs Recorded: {len(logs)}")
    for l in logs[:5]:
        print(f"  [{l.timestamp}] {l.action} -> {l.resource} ({l.details})")

    print("--- 6. Direct SQL Inspection Across All Tables ---")
    table_counts = {}
    for table in ["workspaces", "users", "datasets", "analyses", "reports", "experiments", "audit_logs"]:
        cnt = db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
        table_counts[table] = cnt
        print(f"Table [{table}]: {cnt} records")

    db.close()
    return table_counts

if __name__ == "__main__":
    run_verification()
