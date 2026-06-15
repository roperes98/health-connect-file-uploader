import urllib.request
import re

url = "https://developer.android.com/health-and-fitness/health-connect/medical-records/write-data"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    # find all code blocks
    blocks = re.findall(r'<code.*?>(.*?)</code>', html, re.DOTALL)
    for i, b in enumerate(blocks):
        text = re.sub(r'<[^>]+>', '', b).strip()
        if "insertMedicalResources" in text or "MedicalDataSource" in text or "MedicalResource" in text or "insertMedicalDataSources" in text:
            print(f"--- Block {i} ---")
            print(text)
except Exception as e:
    print(e)
