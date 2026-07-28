import logging
import json
import sys
import os
import traceback
import contextvars
from datetime import datetime

# Global context variable for tracking request/turn trace contexts
# dynamically across threads/async tasks
current_trace_id = contextvars.ContextVar("current_trace_id", default=None)


class GCPJsonFormatter(logging.Formatter):
    """Formats standard python logs as JSON matching Google Cloud Logging format."""

    def format(self, record):
        message = record.getMessage()

        # Build base entry
        log_entry = {
            "severity": record.levelname,
            "message": message,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "logging.googleapis.com/sourceLocation": {
                "file": record.pathname,
                "line": record.lineno,
                "function": record.funcName,
            },
        }

        # Handle exception tracebacks if present
        if record.exc_info:
            log_entry["exception"] = "".join(traceback.format_exception(*record.exc_info))

        # Handle additional extra attributes passed via extra={}
        # Ignore standard logger record attributes
        standard_fields = {
            "args",
            "asctime",
            "created",
            "exc_info",
            "exc_text",
            "filename",
            "funcName",
            "levelname",
            "levelno",
            "lineno",
            "module",
            "msecs",
            "message",
            "msg",
            "name",
            "pathname",
            "process",
            "processName",
            "relativeCreated",
            "stack_info",
            "thread",
            "threadName",
        }

        extra_data = {k: v for k, v in record.__dict__.items() if k not in standard_fields}
        if extra_data:
            log_entry["payload"] = extra_data

        # Trace context integration if running under GCP / OpenTelemetry contexts
        trace_id = current_trace_id.get() or os.getenv("TRACE_ID")
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT_ID")
        if trace_id and project_id:
            log_entry["logging.googleapis.com/trace"] = f"projects/{project_id}/traces/{trace_id}"

        return json.dumps(log_entry)


def get_logger(name: str = "agent") -> logging.Logger:
    """Returns a pre-configured logger with Google Cloud Logging JSON formatter."""
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Avoid adding duplicate handlers if already configured
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(GCPJsonFormatter())
        logger.addHandler(handler)

    return logger
