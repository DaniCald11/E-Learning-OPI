"""Wait for functional local readiness, failing with a bounded timeout."""
import time
import urllib.request
for url in ['http://127.0.0.1:5080/api/v1/health', 'http://127.0.0.1:5173/']:
    deadline = time.monotonic() + 60
    while True:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status == 200:
                    break
        except (OSError, ValueError):
            pass
        if time.monotonic() >= deadline:
            raise SystemExit('Development service readiness failed: ' + url)
        time.sleep(0.5)
print('API/SQL and frontend ready.')
