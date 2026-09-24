"""
Structured Logging & Request Correlation Middleware for CRISP AI 3.0 Enterprise
Injects and tracks X-Request-ID across all requests, logging execution latency
and status codes in structured JSON format for SIEM/observability ingestion.
"""

import time
import uuid
import json
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("crisp_audit")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class RequestCorrelationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()

        # Extract or generate X-Request-ID
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        # Process request
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as exc:
            status_code = 500
            raise exc
        finally:
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            log_payload = {
                "event": "http_request",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": status_code,
                "latency_ms": latency_ms,
                "client_ip": request.client.host if request.client else "unknown"
            }
            logger.info(json.dumps(log_payload))

        response.headers["X-Request-ID"] = request_id
        return response
