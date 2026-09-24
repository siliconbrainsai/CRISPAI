"""
Full API and Database Regression Verification Suite for Phase 5
Verifies all 9 API routes, data persistence in SQLite, and end-to-end data flow:
1. /api/upload/tabular
2. /api/pipeline/run
3. /api/pipeline/status/{job_id}
4. /api/pipeline/results/{job_id}
5. /api/datasets
6. /api/analyses
7. /api/reports
8. /api/experiments
9. /api/audit-logs
"""

import os
import sys
import io
import time
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core.db import SessionLocal
from app.models.db.entities import Dataset, Analysis, Report, Experiment, AuditLog

client = TestClient(app)

def verify_all_api_endpoints():
    print("\n" + "=" * 80)
    print("CRISP AI 3.0: FULL API & ENTERPRISE PERSISTENCE REGRESSION")
    print("=" * 80)

    # 1. Test /api/upload/tabular
    print("1. Verifying /api/upload/tabular...")
    test_df = pd.DataFrame({
        "var_a": np.random.normal(0, 1, 60),
        "var_b": np.random.normal(0, 1, 60),
        "env_flag": [0] * 30 + [1] * 30,
        "target": np.random.normal(0, 1, 60)
    })
    buf = io.BytesIO()
    test_df.to_csv(buf, index=False)
    buf.seek(0)

    up_res = client.post("/api/upload/tabular", files={"file": ("regression_test.csv", buf, "text/csv")})
    assert up_res.status_code == 200, f"Upload failed: {up_res.text}"
    up_data = up_res.json()
    assert os.path.exists(up_data["file_path"])
    print(f"   [OK] Uploaded {up_data['filename']} -> {up_data['file_path']}")

    # 2. Test /api/datasets (POST & GET)
    print("\n2. Verifying /api/datasets...")
    ds_res = client.post("/api/datasets", json={
        "filename": up_data["filename"],
        "row_count": up_data["row_count"],
        "schema_definition": up_data["columns"],
        "file_path": up_data["file_path"]
    })
    assert ds_res.status_code == 200
    dataset_id = ds_res.json()["id"]

    ds_get_res = client.get("/api/datasets")
    assert ds_get_res.status_code == 200
    assert any(d["id"] == dataset_id for d in ds_get_res.json())
    print(f"   [OK] Created and listed Dataset ID: {dataset_id}")

    # 3. Test /api/analyses (POST & GET)
    print("\n3. Verifying /api/analyses...")
    an_res = client.post("/api/analyses", json={
        "dataset_id": dataset_id,
        "outcome": "target",
        "candidates": ["var_a", "var_b"],
        "environments": ["env_flag"],
        "method": "PC-Algorithm / IRM Ensemble",
        "status": "RUNNING"
    })
    assert an_res.status_code == 200
    analysis_id = an_res.json()["id"]

    an_get_res = client.get("/api/analyses")
    assert an_get_res.status_code == 200
    assert any(a["id"] == analysis_id for a in an_get_res.json())
    print(f"   [OK] Created and listed Analysis ID: {analysis_id}")

    # 4. Test /api/pipeline/run & /api/pipeline/status & /api/pipeline/results
    print("\n4. Verifying /api/pipeline/run, status, and results...")
    pipe_res = client.post("/api/pipeline/run", json={
        "models": ["IRM", "PC"],
        "alpha": 0.05,
        "environment_keys": ["env_flag"],
        "environments": ["env_flag"],
        "dataset_id": dataset_id,
        "file_path": up_data["file_path"],
        "outcome": "target",
        "candidates": ["var_a", "var_b"],
        "analysis_id": analysis_id,
        "seed": 42
    })
    assert pipe_res.status_code == 200
    job_id = pipe_res.json()["job_id"]
    print(f"   Dispatched Job ID: {job_id}")

    # Poll status
    for _ in range(20):
        st_res = client.get(f"/api/pipeline/status/{job_id}")
        assert st_res.status_code == 200
        if st_res.json()["status"] in ["COMPLETED", "FAILED"]:
            break
        time.sleep(0.4)
    assert st_res.json()["status"] == "COMPLETED"
    print(f"   [OK] Job reached COMPLETED state")

    # Fetch results from both /api/pipeline/results/{job_id} and /api/results/{job_id}
    res1 = client.get(f"/api/pipeline/results/{job_id}")
    res2 = client.get(f"/api/results/{job_id}")
    assert res1.status_code == 200
    assert res2.status_code == 200
    assert res1.json()["analysis_code"] == res2.json()["analysis_code"]
    print(f"   [OK] Dual-routing results confirmed: {res1.json()['analysis_code']}")

    # 5. Test /api/reports (POST & GET)
    print("\n5. Verifying /api/reports...")
    rep_res = client.post("/api/reports", json={
        "title": "Regression Test Report",
        "analysis_id": analysis_id,
        "dataset_id": dataset_id,
        "status": "PUBLISHED",
        "insights": res1.json()
    })
    assert rep_res.status_code == 200
    report_id = rep_res.json()["id"]

    rep_get_res = client.get("/api/reports")
    assert rep_get_res.status_code == 200
    assert any(r["id"] == report_id for r in rep_get_res.json())
    print(f"   [OK] Created and listed Report ID: {report_id}")

    # 6. Test /api/experiments (POST & GET)
    print("\n6. Verifying /api/experiments...")
    exp_res = client.post("/api/experiments", json={
        "name": "Phase 5 Regression Experiment",
        "hypothesis": "Test that all routes operate deterministically",
        "dataset_name": up_data["filename"],
        "dataset_id": dataset_id,
        "outcome": "target",
        "treatment": "var_a",
        "environment": "env_flag",
        "methodology": "PC + IRM",
        "status": "COMPLETED"
    })
    assert exp_res.status_code == 200
    exp_id = exp_res.json()["id"]

    exp_get_res = client.get("/api/experiments")
    assert exp_get_res.status_code == 200
    assert any(e["id"] == exp_id for e in exp_get_res.json())
    print(f"   [OK] Created and listed Experiment ID: {exp_id}")

    # 7. Test /api/audit-logs (POST & GET)
    print("\n7. Verifying /api/audit-logs...")
    audit_res = client.post("/api/audit-logs", json={
        "action": "PHASE_5_VERIFIED",
        "resource": "system",
        "resource_id": "phase-5",
        "status": "SUCCESS",
        "details": "Full regression test completed without error"
    })
    assert audit_res.status_code == 200

    audit_get_res = client.get("/api/audit-logs")
    assert audit_get_res.status_code == 200
    assert len(audit_get_res.json()) > 0
    print(f"   [OK] Verified Audit Log audit trail (total {len(audit_get_res.json())} entries)")

    # 8. Verify SQLite Direct Persistence
    print("\n8. Verifying SQLite Direct Table Records...")
    db = SessionLocal()
    assert db.query(Dataset).count() >= 1
    assert db.query(Analysis).count() >= 1
    assert db.query(Report).count() >= 1
    assert db.query(Experiment).count() >= 1
    assert db.query(AuditLog).count() >= 1
    db.close()
    print("   [OK] Direct SQL persistence verified across all 5 core entity tables.")

    print("\n" + "=" * 80)
    print("ALL 9 API ENDPOINTS AND ENTERPRISE MODULES FULLY OPERATIONAL!")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    verify_all_api_endpoints()
