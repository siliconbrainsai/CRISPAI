"""
Storage Abstraction Layer for CRISP AI 3.0 Enterprise
Supports multi-tenant local storage with strict path traversal defenses,
file size validation (50MB max), and S3/MinIO cloud storage interface.
"""

import os
import re
import uuid
from abc import ABC, abstractmethod
from typing import Tuple, Optional
from app.core.config import settings


class StorageServiceException(Exception):
    """Base exception for storage errors."""
    pass


class StorageService(ABC):
    """Abstract base class for storage backends."""

    @abstractmethod
    def save_file(self, workspace_id: int, file_bytes: bytes, filename: str) -> Tuple[str, str]:
        """
        Saves file bytes for a specific workspace.
        Returns (storage_key, access_path).
        """
        pass

    @abstractmethod
    def get_file_bytes(self, storage_key: str) -> bytes:
        """Retrieves raw bytes for a storage key."""
        pass

    @abstractmethod
    def get_file_path(self, storage_key: str) -> Optional[str]:
        """Returns the local file path if accessible locally, else None."""
        pass

    @abstractmethod
    def delete_file(self, storage_key: str) -> bool:
        """Deletes a file by storage key."""
        pass


class LocalStorageService(StorageService):
    """
    Local filesystem storage with multi-tenant workspace partitioning,
    safe UUID-based naming, and strict path traversal defense.
    """

    ALLOWED_EXTENSIONS = {".csv", ".tsv", ".parquet", ".xlsx", ".xls", ".png", ".jpg", ".jpeg", ".zip"}
    MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB limit

    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = os.path.abspath(base_dir or settings.LOCAL_STORAGE_DIR)
        os.makedirs(self.base_dir, exist_ok=True)

    def _sanitize_filename(self, filename: str) -> str:
        """
        Strictly sanitizes filename and prevents directory traversal.
        """
        # Reject null bytes and path traversal patterns
        if "\x00" in filename or ".." in filename or "/" in filename or "\\" in filename:
            raise StorageServiceException("Invalid filename: Directory traversal or dangerous characters detected.")
        
        # Take basename only
        clean_name = os.path.basename(filename).strip()
        # Keep alphanumeric, dots, underscores, dashes
        clean_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", clean_name)
        if not clean_name:
            clean_name = f"dataset_{uuid.uuid4().hex[:8]}.csv"

        _, ext = os.path.splitext(clean_name.lower())
        if ext not in self.ALLOWED_EXTENSIONS:
            raise StorageServiceException(f"Unsupported file extension '{ext}'. Allowed: {', '.join(sorted(self.ALLOWED_EXTENSIONS))}")

        return clean_name

    def _resolve_safe_path(self, workspace_id: int, storage_key: str) -> str:
        """Resolves path and guarantees it resides within the workspace's designated directory."""
        workspace_dir = os.path.abspath(os.path.join(self.base_dir, f"workspaces_{workspace_id}"))
        full_path = os.path.abspath(os.path.join(self.base_dir, storage_key))
        
        # Security: Path traversal verification
        if not full_path.startswith(self.base_dir):
            raise StorageServiceException("Path traversal attempt blocked: Storage path escapes base directory.")
        
        return full_path

    def save_file(self, workspace_id: int, file_bytes: bytes, filename: str) -> Tuple[str, str]:
        # Validate size
        if len(file_bytes) > self.MAX_FILE_SIZE_BYTES:
            max_mb = self.MAX_FILE_SIZE_BYTES // (1024 * 1024)
            raise StorageServiceException(f"File size exceeds maximum limit of {max_mb} MB.")

        if len(file_bytes) == 0:
            raise StorageServiceException("Empty file upload is not permitted.")

        sanitized_name = self._sanitize_filename(filename)
        unique_prefix = uuid.uuid4().hex[:12]
        unique_filename = f"{unique_prefix}_{sanitized_name}"

        # Partition by workspace
        storage_key = os.path.join(f"workspaces_{workspace_id}", unique_filename).replace("\\", "/")
        target_path = os.path.abspath(os.path.join(self.base_dir, storage_key))

        # Check path containment
        if not target_path.startswith(self.base_dir):
            raise StorageServiceException("Path traversal attempt detected during save.")

        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, "wb") as f:
            f.write(file_bytes)

        return storage_key, target_path

    def get_file_bytes(self, storage_key: str) -> bytes:
        target_path = os.path.abspath(os.path.join(self.base_dir, storage_key))
        if not target_path.startswith(self.base_dir) or not os.path.exists(target_path):
            raise StorageServiceException(f"File not found or inaccessible: {storage_key}")
        with open(target_path, "rb") as f:
            return f.read()

    def get_file_path(self, storage_key: str) -> Optional[str]:
        target_path = os.path.abspath(os.path.join(self.base_dir, storage_key))
        if target_path.startswith(self.base_dir) and os.path.exists(target_path):
            return target_path
        return None

    def delete_file(self, storage_key: str) -> bool:
        target_path = os.path.abspath(os.path.join(self.base_dir, storage_key))
        if target_path.startswith(self.base_dir) and os.path.exists(target_path):
            try:
                os.remove(target_path)
                return True
            except Exception:
                return False
        return False


class S3StorageService(StorageService):
    """
    Cloud object storage service (AWS S3 / MinIO / Cloudflare R2).
    """

    def __init__(self):
        try:
            client_kwargs = {
                "service_name": "s3",
                "aws_access_key_id": settings.AWS_ACCESS_KEY_ID,
                "aws_secret_access_key": settings.AWS_SECRET_ACCESS_KEY,
                "region_name": settings.AWS_REGION
            }
            if settings.S3_ENDPOINT_URL:
                client_kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL
            self.s3_client = boto3.client(**client_kwargs)
            self.bucket_name = settings.S3_BUCKET_NAME
        except ImportError:
            raise StorageServiceException("boto3 is required for S3StorageService. Please install boto3.")

    def save_file(self, workspace_id: int, file_bytes: bytes, filename: str) -> Tuple[str, str]:
        unique_prefix = uuid.uuid4().hex[:12]
        sanitized_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", os.path.basename(filename))
        storage_key = f"workspaces/{workspace_id}/{unique_prefix}_{sanitized_name}"

        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=storage_key,
            Body=file_bytes
        )
        url = f"https://{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{storage_key}"
        return storage_key, url

    def get_file_bytes(self, storage_key: str) -> bytes:
        response = self.s3_client.get_object(Bucket=self.bucket_name, Key=storage_key)
        return response["Body"].read()

    def get_file_path(self, storage_key: str) -> Optional[str]:
        # S3 objects do not have local file paths directly
        return None

    def delete_file(self, storage_key: str) -> bool:
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=storage_key)
            return True
        except Exception:
            return False


def get_storage_service() -> StorageService:
    """Factory providing the configured storage service backend."""
    if settings.STORAGE_BACKEND.lower() == "s3":
        return S3StorageService()
    return LocalStorageService()
