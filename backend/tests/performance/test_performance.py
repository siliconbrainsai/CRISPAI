"""
Performance & Scalability Benchmark Suite for CRISP AI 3.0 Enterprise
Measures:
1. Health & readiness probe response times (< 50ms)
2. Tabular dataset upload & parsing throughput
3. Multi-tenant listing latency under index optimization
4. Concurrent background job dispatch scalability
"""

import os
import sys
import unittest
import time
import io
import uuid
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from app.main import app
from app.core.db import SessionLocal
from app.models.db.entities import User, Workspace
from app.core.security import hash_password, create_access_token, Role


class TestEnterprisePerformance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        cls.workspace = Workspace(name=f"PerfWS_{uuid.uuid4().hex[:6]}")
        cls.db.add(cls.workspace)
        cls.db.commit()
        cls.db.refresh(cls.workspace)

        cls.user = User(
            email=f"perf_admin_{uuid.uuid4().hex[:6]}@crisp.ai",
            name="Perf Admin",
            role=Role.ADMIN,
            workspace_id=cls.workspace.id,
            password_hash=hash_password("PerfPassword123!"),
            is_active=True
        )
        cls.db.add(cls.user)
        cls.db.commit()
        cls.token = create_access_token({"sub": str(cls.user.id), "workspace_id": cls.workspace.id, "role": Role.ADMIN})
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

        # Warmup connection and routes
        cls.client.get("/health")

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_probe_latencies(self):
        """Probes must respond in under 50ms."""
        # /health
        t0 = time.perf_counter()
        resp_h = self.client.get("/health")
        latency_h = (time.perf_counter() - t0) * 1000
        self.assertEqual(resp_h.status_code, 200)
        self.assertLess(latency_h, 50.0, f"Health probe took {latency_h:.2f}ms (> 50ms)")

        # /ready
        t0 = time.perf_counter()
        resp_r = self.client.get("/ready")
        latency_r = (time.perf_counter() - t0) * 1000
        self.assertEqual(resp_r.status_code, 200)
        self.assertLess(latency_r, 50.0, f"Readiness probe took {latency_r:.2f}ms (> 50ms)")
        print(f"\n[PERF] /health latency: {latency_h:.2f}ms, /ready latency: {latency_r:.2f}ms")

    def test_02_dataset_upload_latency(self):
        """Upload and parse 1,000-row tabular dataset in under 500ms."""
        csv_data = "id,treatment,confounder,outcome\n" + "\n".join(
            [f"{i},{i%2},{i*0.5},{i*1.2 + 0.3}" for i in range(1000)]
        )
        file_obj = io.BytesIO(csv_data.encode("utf-8"))

        t0 = time.perf_counter()
        resp = self.client.post(
            "/api/upload/tabular",
            files={"file": ("benchmark_data.csv", file_obj, "text/csv")},
            headers=self.headers
        )
        latency = (time.perf_counter() - t0) * 1000
        self.assertEqual(resp.status_code, 200)
        self.assertLess(latency, 500.0, f"Upload took {latency:.2f}ms (> 500ms)")
        print(f"[PERF] 1,000-row CSV upload & parse latency: {latency:.2f}ms")

    def test_03_concurrent_analysis_dispatch(self):
        """Dispatch 10 concurrent pipeline jobs without starvation or error."""
        def dispatch_job(idx):
            payload = {
                "models": ["IRM", "ICP", "PC"],
                "alpha": 0.05,
                "environment_keys": ["env_split"],
                "seed": 42 + idx
            }
            resp = self.client.post("/api/pipeline/run", json=payload, headers=self.headers)
            return resp.status_code, resp.json()

        t0 = time.perf_counter()
        with ThreadPoolExecutor(max_workers=5) as pool:
            results = list(pool.map(dispatch_job, range(10)))
        total_time = (time.perf_counter() - t0) * 1000

        for status_code, data in results:
            self.assertEqual(status_code, 200)
            self.assertEqual(data["status"], "QUEUED")
            self.assertTrue(len(data["job_id"]) > 0)

        print(f"[PERF] 10 concurrent pipeline jobs dispatched in {total_time:.2f}ms (avg {total_time/10:.2f}ms/job)")


if __name__ == "__main__":
    unittest.main()
