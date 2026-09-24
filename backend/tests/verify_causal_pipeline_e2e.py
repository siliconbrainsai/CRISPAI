"""
End-to-End API Integration Test for CRISP AI 3.0 Causal Engine
Tests full cycle:
1. Upload CSV dataset to /api/upload/tabular
2. Create dataset in SQLite via /api/datasets
3. Start causal discovery pipeline via /api/pipeline/run
4. Check status via /api/pipeline/status/{job_id}
5. Fetch results via /api/results/{job_id}
6. Verify SQLite database persistence and audit trails
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
from app.models.db.entities import Dataset, Analysis, AuditLog

client = TestClient(app)

def run_e2e_verification():
    print("=== Starting Causal Engine E2E Verification ===")

    # 1. Create a synthetic clinical dataset with true causal & spurious mechanisms
    np.random.seed(123)
    n = 200
    env = [0] * 100 + [1] * 100
    age = np.random.normal(55, 10, n)
    biomarker_a = 0.5 * age + np.random.normal(0, 2, n)
    treatment = np.where(biomarker_a > np.median(biomarker_a), 1.0, 0.0)
    # Outcome: positive effect of treatment (2.5) and age (0.3)
    recovery_score = 2.5 * treatment + 0.3 * age + np.random.normal(0, 1, n)
    # Spurious hospital ID that correlates positively in env 0, negatively in env 1
    hospital_metric = np.zeros(n)
    hospital_metric[:100] = 1.8 * recovery_score[:100] + np.random.normal(0, 0.5, 100)
    hospital_metric[100:] = -1.8 * recovery_score[100:] + np.random.normal(0, 0.5, 100)

    test_df = pd.DataFrame({
        "age": age,
        "biomarker_a": biomarker_a,
        "treatment": treatment,
        "hospital_metric": hospital_metric,
        "recovery_score": recovery_score,
        "study_site": env
    })

    csv_bytes = io.BytesIO()
    test_df.to_csv(csv_bytes, index=False)
    csv_bytes.seek(0)

    # 2. Upload file via /api/upload/tabular
    print("\n1. Testing POST /api/upload/tabular...")
    upload_res = client.post(
        "/api/upload/tabular",
        files={"file": ("clinical_trial_cohort.csv", csv_bytes, "text/csv")}
    )
    assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
    upload_data = upload_res.json()
    print(f"   Uploaded: {upload_data['filename']} ({upload_data['row_count']} rows, {len(upload_data['columns'])} cols)")
    print(f"   Saved at: {upload_data['file_path']}")
    assert os.path.exists(upload_data['file_path']), "Uploaded file was not saved to disk!"

    # 3. Create Dataset in SQLite
    print("\n2. Testing POST /api/datasets...")
    dataset_res = client.post(
        "/api/datasets",
        json={
            "filename": upload_data["filename"],
            "row_count": upload_data["row_count"],
            "schema_definition": upload_data["columns"],
            "file_path": upload_data["file_path"]
        }
    )
    assert dataset_res.status_code == 200, f"Dataset creation failed: {dataset_res.text}"
    dataset_data = dataset_res.json()
    dataset_id = dataset_data["id"]
    print(f"   Created Dataset ID: {dataset_id}")

    # 4. Create Analysis record
    print("\n3. Testing POST /api/analyses...")
    analysis_create_res = client.post(
        "/api/analyses",
        json={
            "dataset_id": dataset_id,
            "outcome": "recovery_score",
            "candidates": ["treatment", "age", "biomarker_a", "hospital_metric"],
            "environments": ["study_site"],
            "method": "PC-Algorithm / IRM Ensemble",
            "status": "RUNNING"
        }
    )
    assert analysis_create_res.status_code == 200, f"Analysis creation failed: {analysis_create_res.text}"
    analysis_id = analysis_create_res.json()["id"]
    print(f"   Created Analysis ID: {analysis_id}")

    # 5. Run Pipeline via /api/pipeline/run
    print("\n4. Testing POST /api/pipeline/run...")
    pipeline_res = client.post(
        "/api/pipeline/run",
        json={
            "models": ["IRM", "ICP", "PC"],
            "alpha": 0.05,
            "environment_keys": ["study_site"],
            "environments": ["study_site"],
            "dataset_id": dataset_id,
            "file_path": upload_data["file_path"],
            "outcome": "recovery_score",
            "candidates": ["treatment", "age", "biomarker_a", "hospital_metric"],
            "analysis_id": analysis_id,
            "seed": 42
        }
    )
    assert pipeline_res.status_code == 200, f"Pipeline run failed: {pipeline_res.text}"
    job_id = pipeline_res.json()["job_id"]
    print(f"   Pipeline Job Dispatched: {job_id}")

    # 6. Poll /api/pipeline/status/{job_id}
    print("\n5. Polling GET /api/pipeline/status/{job_id}...")
    max_wait = 15
    start_time = time.time()
    status_data = None
    while time.time() - start_time < max_wait:
        status_res = client.get(f"/api/pipeline/status/{job_id}")
        assert status_res.status_code == 200
        status_data = status_res.json()
        print(f"   Status: {status_data['status']} (progress: {status_data.get('progress')}%)")
        if status_data["status"] in ["COMPLETED", "FAILED"]:
            break
        time.sleep(0.5)

    assert status_data["status"] == "COMPLETED", f"Pipeline did not complete successfully: {status_data}"

    # 7. Get Results via /api/results/{job_id}
    print("\n6. Testing GET /api/results/{job_id}...")
    results_res = client.get(f"/api/results/{job_id}")
    assert results_res.status_code == 200, f"Results fetch failed: {results_res.text}"
    results = results_res.json()

    print(f"   Analysis Code: {results.get('analysis_code')}")
    print(f"   Sample Size: {results.get('sample_size')}")
    print(f"   Ranked Features ({len(results['causal_features'])}):")
    for f in results['causal_features']:
        status_tag = "SPURIOUS" if f['is_spurious'] else "INVARIANT CAUSAL"
        print(f"     - {f['feature']}: score={f['score']}, stability={f['stability_score']} [{status_tag}]")

    print(f"   DAG Edges ({len(results['causal_edges'])}):")
    for e in results['causal_edges']:
        print(f"     - {e['source']} -> {e['target']}: effect={e.get('effect')}, conf={e.get('confidence')}")

    print(f"   ATE Causal Effects ({len(results['causal_effects'])}):")
    for eff in results['causal_effects']:
        print(f"     - Treatment '{eff['treatment']}': ATE={eff['ate']} 95% CI={eff['confidence_interval']} (p={eff['p_value']}) [{eff['method']}]")

    # Verify hospital_metric was rejected as spurious
    hosp_feat = next(f for f in results['causal_features'] if f['feature'] == 'hospital_metric')
    assert hosp_feat['is_spurious'] is True, "hospital_metric must be rejected as spurious!"
    print("\n   [VERIFIED] Spurious correlation hospital_metric was successfully flagged and rejected.")

    # 8. Check Database Persistence
    print("\n7. Verifying SQLite Database Persistence...")
    db = SessionLocal()
    db_analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    assert db_analysis is not None
    assert db_analysis.status == "COMPLETED"
    assert db_analysis.analysis_code is not None
    assert len(db_analysis.feature_ranking) > 0
    assert len(db_analysis.dag_info) > 0
    assert len(db_analysis.assumptions) > 0
    assert len(db_analysis.limitations) > 0

    audit_entry = db.query(AuditLog).filter(
        AuditLog.resource == "analysis",
        AuditLog.resource_id == str(analysis_id),
        AuditLog.action == "ANALYSIS_COMPLETED"
    ).first()
    assert audit_entry is not None, "Missing audit log entry for completed analysis!"

    db.close()
    print("   [VERIFIED] SQLite records for Analysis and AuditLog successfully confirmed.")
    print("\n=== ALL E2E CAUSAL ENGINE TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_e2e_verification()
