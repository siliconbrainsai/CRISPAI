"""
Enterprise Security, Authentication, RBAC, and Multi-Tenant Isolation Test Suite
Validates:
1. Authentication (JWT generation, password bcrypt verification, invalid password rejection)
2. RBAC Permissions (Role.VIEWER, Role.ANALYST, Role.DATA_SCIENTIST, Role.ADMIN)
3. Multi-Tenant Workspace Isolation (Cross-workspace data leakage prevention)
4. Path Traversal & File Upload Defense (Rejection of directory traversal and oversized files)
5. Observability & Probes (/health, /ready, X-Request-ID propagation)
"""

import os
import sys
import unittest
import io
import uuid

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from app.main import app
from app.core.db import SessionLocal
from app.models.db.entities import User, Workspace, Dataset, AuditLog
from app.core.security import hash_password, create_access_token, Role


class TestEnterpriseSecurityRBAC(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # Create isolated test workspaces
        cls.ws_alpha = Workspace(name=f"AlphaCorp_{uuid.uuid4().hex[:6]}")
        cls.ws_beta = Workspace(name=f"BetaLLC_{uuid.uuid4().hex[:6]}")
        cls.db.add_all([cls.ws_alpha, cls.ws_beta])
        cls.db.commit()
        cls.db.refresh(cls.ws_alpha)
        cls.db.refresh(cls.ws_beta)

        # Create test users across roles
        cls.admin_alpha = User(
            email=f"admin_alpha_{uuid.uuid4().hex[:6]}@alpha.com",
            name="Alpha Admin",
            role=Role.ADMIN,
            workspace_id=cls.ws_alpha.id,
            password_hash=hash_password("AdminSecurePassword123!"),
            is_active=True
        )
        cls.viewer_alpha = User(
            email=f"viewer_alpha_{uuid.uuid4().hex[:6]}@alpha.com",
            name="Alpha Viewer",
            role=Role.VIEWER,
            workspace_id=cls.ws_alpha.id,
            password_hash=hash_password("ViewerSecurePassword123!"),
            is_active=True
        )
        cls.analyst_alpha = User(
            email=f"analyst_alpha_{uuid.uuid4().hex[:6]}@alpha.com",
            name="Alpha Analyst",
            role=Role.ANALYST,
            workspace_id=cls.ws_alpha.id,
            password_hash=hash_password("AnalystSecurePassword123!"),
            is_active=True
        )
        cls.admin_beta = User(
            email=f"admin_beta_{uuid.uuid4().hex[:6]}@beta.com",
            name="Beta Admin",
            role=Role.ADMIN,
            workspace_id=cls.ws_beta.id,
            password_hash=hash_password("BetaAdminSecurePassword123!"),
            is_active=True
        )

        cls.db.add_all([cls.admin_alpha, cls.viewer_alpha, cls.analyst_alpha, cls.admin_beta])
        cls.db.commit()

        # Pre-generate JWT tokens
        cls.token_admin_alpha = create_access_token({"sub": str(cls.admin_alpha.id), "workspace_id": cls.ws_alpha.id, "role": Role.ADMIN})
        cls.token_viewer_alpha = create_access_token({"sub": str(cls.viewer_alpha.id), "workspace_id": cls.ws_alpha.id, "role": Role.VIEWER})
        cls.token_analyst_alpha = create_access_token({"sub": str(cls.analyst_alpha.id), "workspace_id": cls.ws_alpha.id, "role": Role.ANALYST})
        cls.token_admin_beta = create_access_token({"sub": str(cls.admin_beta.id), "workspace_id": cls.ws_beta.id, "role": Role.ADMIN})

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_authentication_login_flow(self):
        """Verify successful login returns valid JWT token and bad credentials return 401."""
        # Valid login
        resp = self.client.post("/api/auth/login", json={
            "email": self.admin_alpha.email,
            "password": "AdminSecurePassword123!"
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["token_type"], "bearer")
        self.assertEqual(data["role"], Role.ADMIN)
        self.assertEqual(data["email"], self.admin_alpha.email)

        # Invalid password
        resp_bad = self.client.post("/api/auth/login", json={
            "email": self.admin_alpha.email,
            "password": "WrongPasswordAttempt!"
        })
        self.assertEqual(resp_bad.status_code, 401)
        self.assertIn("Invalid email or password", resp_bad.json()["detail"])

    def test_02_rbac_viewer_restrictions(self):
        """Verify Role.VIEWER is forbidden from creating datasets and deleting datasets."""
        headers = {"Authorization": f"Bearer {self.token_viewer_alpha}"}
        
        # Viewer attempting to create dataset
        resp_create = self.client.post("/api/datasets", json={
            "filename": "viewer_dataset.csv",
            "row_count": 100,
            "workspace_id": self.ws_alpha.id
        }, headers=headers)
        self.assertEqual(resp_create.status_code, 403)
        self.assertIn("Access denied", resp_create.json()["detail"])

        # Viewer attempting to delete dataset
        resp_del = self.client.delete("/api/datasets/1", headers=headers)
        self.assertEqual(resp_del.status_code, 403)

    def test_03_rbac_analyst_restrictions(self):
        """Verify Role.ANALYST cannot delete datasets (Admin / Data Scientist only)."""
        headers = {"Authorization": f"Bearer {self.token_analyst_alpha}"}
        resp_del = self.client.delete("/api/datasets/1", headers=headers)
        self.assertEqual(resp_del.status_code, 403)
        self.assertIn("cannot delete datasets", resp_del.json()["detail"])

    def test_04_multi_tenant_workspace_isolation(self):
        """Verify resources created in Workspace Alpha cannot be viewed or accessed in Workspace Beta."""
        headers_alpha = {"Authorization": f"Bearer {self.token_admin_alpha}"}
        headers_beta = {"Authorization": f"Bearer {self.token_admin_beta}"}

        # 1. Admin Alpha creates dataset in Alpha
        create_resp = self.client.post("/api/datasets", json={
            "filename": "alpha_secret_clinical_trial.csv",
            "row_count": 500,
            "columns": ["patient_id", "dosage", "recovery"],
            "workspace_id": self.ws_alpha.id
        }, headers=headers_alpha)
        self.assertEqual(create_resp.status_code, 200)
        dataset_alpha_id = create_resp.json()["id"]

        # 2. Beta listing must NOT include Alpha's dataset
        beta_list_resp = self.client.get("/api/datasets", headers=headers_beta)
        self.assertEqual(beta_list_resp.status_code, 200)
        beta_dataset_ids = [d["id"] for d in beta_list_resp.json()]
        self.assertNotIn(dataset_alpha_id, beta_dataset_ids)

        # 3. Beta direct GET on Alpha's dataset must return 404 (prevent probe / leakage)
        beta_direct_resp = self.client.get(f"/api/datasets/{dataset_alpha_id}", headers=headers_beta)
        self.assertEqual(beta_direct_resp.status_code, 404)

    def test_05_soft_deletion_and_audit_trail(self):
        """Verify Admin can soft delete dataset; dataset disappears from list; audit log recorded."""
        headers_alpha = {"Authorization": f"Bearer {self.token_admin_alpha}"}

        # Create dataset
        create_resp = self.client.post("/api/datasets", json={
            "filename": "to_be_deleted.csv",
            "row_count": 10,
            "workspace_id": self.ws_alpha.id
        }, headers=headers_alpha)
        ds_id = create_resp.json()["id"]

        # Delete dataset
        del_resp = self.client.delete(f"/api/datasets/{ds_id}", headers=headers_alpha)
        self.assertEqual(del_resp.status_code, 200)
        self.assertIn("soft deleted successfully", del_resp.json()["message"])

        # Verify not in listing
        list_resp = self.client.get("/api/datasets", headers=headers_alpha)
        active_ids = [d["id"] for d in list_resp.json()]
        self.assertNotIn(ds_id, active_ids)

        # Verify Audit Log recorded DATASET_DELETED
        audit_resp = self.client.get("/api/audit-logs", headers=headers_alpha)
        self.assertEqual(audit_resp.status_code, 200)
        actions = [log["action"] for log in audit_resp.json()]
        self.assertIn("DATASET_DELETED", actions)

    def test_06_storage_path_traversal_defense(self):
        """Verify storage service blocks path traversal attacks in filenames."""
        headers_alpha = {"Authorization": f"Bearer {self.token_admin_alpha}"}
        
        # Test path traversal attack in filename
        malicious_file = io.BytesIO(b"colA,colB\n1,2\n3,4")
        resp = self.client.post(
            "/api/upload/tabular",
            files={"file": ("../../etc_passwd.csv", malicious_file, "text/csv")},
            headers=headers_alpha
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Directory traversal or dangerous characters detected", resp.json()["detail"])

    def test_07_storage_oversized_file_defense(self):
        """Verify files exceeding MAX_UPLOAD_SIZE_MB (50MB) are rejected."""
        from app.core.storage import LocalStorageService
        storage = LocalStorageService()
        
        # 51 MB dummy bytes
        oversized_bytes = b"0" * (51 * 1024 * 1024)
        with self.assertRaises(Exception) as cm:
            storage.save_file(workspace_id=1, file_bytes=oversized_bytes, filename="large_data.csv")
        self.assertIn("exceeds maximum limit", str(cm.exception))

    def test_08_observability_probes_and_headers(self):
        """Verify /health, /ready, and X-Request-ID propagation."""
        # /health
        health_resp = self.client.get("/health")
        self.assertEqual(health_resp.status_code, 200)
        self.assertEqual(health_resp.json()["status"], "healthy")
        self.assertIn("X-Request-ID", health_resp.headers)

        # /ready
        ready_resp = self.client.get("/ready")
        self.assertEqual(ready_resp.status_code, 200)
        self.assertEqual(ready_resp.json()["status"], "ready")
        self.assertEqual(ready_resp.json()["database"], "connected")
        self.assertIn("X-Request-ID", ready_resp.headers)


if __name__ == "__main__":
    unittest.main()
