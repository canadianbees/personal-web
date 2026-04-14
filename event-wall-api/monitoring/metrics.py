import os
import time
import threading
from contextlib import contextmanager
from google.cloud import monitoring_v3

_client = None
_project_name = None

# Cloud Monitoring enforces a minimum ~10s write interval per time series.
# Track last write time per series key so concurrent jobs don't collide.
_last_write: dict[str, float] = {}
_last_write_lock = threading.Lock()
_MIN_WRITE_INTERVAL = 10.0  # seconds

def _series_key(metric_type: str, labels: dict) -> str:
    return f"{metric_type}:{sorted((labels or {}).items())}"

def _throttle(entries: list[tuple]) -> list[tuple]:
    """Drop any entries whose time series was written within the last 10s."""
    now = time.monotonic()
    allowed = []
    with _last_write_lock:
        for entry in entries:
            metric_type, _, labels, _ = entry
            key = _series_key(metric_type, labels)
            if now - _last_write.get(key, 0.0) >= _MIN_WRITE_INTERVAL:
                _last_write[key] = now
                allowed.append(entry)
    return allowed

def _get_client():
    global _client, _project_name
    if _client is None:
        _client = monitoring_v3.MetricServiceClient()
        project_id = os.getenv("GCP_PROJECT_ID")
        _project_name = f"projects/{project_id}"
    return _client, _project_name


def _make_series(metric_type: str, value: float, labels: dict[str, str], is_int: bool, interval) -> monitoring_v3.TimeSeries:
    point_value = {"int64_value": int(value)} if is_int else {"double_value": value}
    return monitoring_v3.TimeSeries({
        "metric": {
            "type": f"custom.googleapis.com/eventwall/{metric_type}",
            "labels": labels or {},
        },
        "resource": {"type": "global"},
        "points": [monitoring_v3.Point({"interval": interval, "value": point_value})],
    })


def _write_batch(entries: list[tuple]):
    """entries: list of (metric_type, value, labels, is_int)"""
    entries = _throttle(entries)
    if not entries:
        return
    try:
        client, project_name = _get_client()

        now = time.time()
        interval = monitoring_v3.TimeInterval({
            "end_time": {"seconds": int(now), "nanos": int((now % 1) * 1e9)}
        })

        series = [_make_series(t, v, l, i, interval) for t, v, l, i in entries]
        client.create_time_series(name=project_name, time_series=series)

    except Exception as e:
        print(f"[metrics] failed to write batch: {e}")


def record_upload_success(media_type: str):
    _write_batch([("upload/success", 1, {"media_type": media_type}, True)])

def record_upload_failure(media_type: str):
    _write_batch([("upload/failure", 1, {"media_type": media_type}, True)])

def record_processing_latency(media_type: str, latency_ms: float):
    _write_batch([("upload/processing_latency_ms", latency_ms, {"media_type": media_type}, False)])

def record_compression(codec: str, before_kb: float, after_kb: float, reduction_pct: float):
    _write_batch([
        ("compression/before_kb",     before_kb,     {"codec": codec}, False),
        ("compression/after_kb",      after_kb,      {"codec": codec}, False),
        ("compression/reduction_pct", reduction_pct, {"codec": codec}, False),
    ])

def record_gcs_latency(prefix: str, latency_ms: float):
    _write_batch([("gcs/upload_latency_ms", latency_ms, {"prefix": prefix}, False)])

def record_encode_step_latency(step: str, latency_ms: float):
    _write_batch([("encode/step_latency_ms", latency_ms, {"step": step}, False)])

def record_selected_crf(crf: int):
    _write_batch([("encode/selected_crf", float(crf), {}, True)])

def record_complexity_score(score: float):
    _write_batch([("encode/complexity_score", score, {}, False)])


@contextmanager
def timed(label: str):
    """Context manager that yields elapsed ms."""
    start = time.monotonic()
    result = {"ms": 0.0}
    yield result
    result["ms"] = (time.monotonic() - start) * 1000
