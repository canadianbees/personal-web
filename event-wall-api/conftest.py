import sys
import os
from unittest import mock

sys.path.insert(0, os.path.dirname(__file__))

# Ensure Homebrew binaries (ffmpeg, etc.) are on PATH on macOS
_homebrew_bin = "/opt/homebrew/bin"
if _homebrew_bin not in os.environ.get("PATH", ""):
    os.environ["PATH"] = _homebrew_bin + ":" + os.environ.get("PATH", "")

# storage/gcs.py calls storage.Client() at module level — patch before any test
# file imports it so collection doesn't fail without GCS credentials
mock.patch('google.cloud.storage.Client').start()

# main.py reads API_SECRET from env at import time
os.environ.setdefault('API_SECRET', 'test-secret')
