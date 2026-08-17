import json
import urllib.request
from pathlib import Path

ENV = {}
for line in Path(r"C:\Users\Admin\Documents\GitHub\ERP-retail\.env.local").read_text(encoding="utf-8").splitlines():
    m = line.strip().split("=", 1)
    if len(m) == 2:
        ENV[m[0]] = m[1].strip().strip('"')

API = f"{ENV['NEXT_PUBLIC_APPWRITE_ENDPOINT']}/databases/erp"
HEADERS = {
    "X-Appwrite-Project": ENV["NEXT_PUBLIC_APPWRITE_PROJECT_ID"],
    "X-Appwrite-Key": ENV["APPWRITE_API_KEY"],
    "Content-Type": "application/json",
}
DOC_ID = "6a81d30a00301da60562"
req = urllib.request.Request(
    f"{API}/collections/products/documents/{DOC_ID}",
    method="PATCH",
    headers=HEADERS,
    data=json.dumps({"data": {"min_stock": 0}}).encode(),
)
try:
    with urllib.request.urlopen(req) as r:
        print("OK", json.loads(r.read().decode()).get("min_stock"))
except urllib.error.HTTPError as e:
    print("ERR", e.code, e.read().decode())
