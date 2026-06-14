import csv
import random
import math
from datetime import datetime, timedelta

random.seed(42)

def random_date(start_days_ago=365):
    base = datetime.now()
    delta = timedelta(days=random.randint(0, start_days_ago), 
                      hours=random.randint(0, 23), 
                      minutes=random.randint(0, 59))
    return (base - delta).strftime("%Y-%m-%dT%H:%M:%S")

def random_ip():
    return f"{random.randint(1,255)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(0,255)}"

# ─── 1. file_access_history.csv (200 rows) ───────────────────────────────────
file_names = {
    "pdf":   ["report", "invoice", "manual", "thesis", "summary", "guide"],
    "image": ["photo", "screenshot", "diagram", "chart", "scan", "portrait"],
    "video": ["demo", "tutorial", "presentation", "recording", "clip", "tour"],
    "code":  ["main", "utils", "config", "tests", "api", "schema"],
    "spreadsheet": ["budget", "sales", "data", "tracker", "metrics", "forecast"],
}
tags_pool = ["finance","engineering","media","education","personal","project","research","hr"]
file_types = list(file_names.keys())

with open("file_access_history.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["user_id","file_id","file_name","file_type","access_count","last_accessed","tags"])
    for i in range(200):
        uid = f"U{random.randint(1,20):03d}"
        fid = f"F{random.randint(1,30):03d}"
        ftype = random.choice(file_types)
        fname = random.choice(file_names[ftype]) + f"_{random.randint(1,99)}.{ftype if ftype!='spreadsheet' else 'xlsx'}"
        access = random.randint(1, 120)
        last_acc = random_date(180)
        tags = ",".join(random.sample(tags_pool, random.randint(1,3)))
        writer.writerow([uid, fid, fname, ftype, access, last_acc, tags])

print("✓ file_access_history.csv")

# ─── 2. activity_logs_anomaly.csv (300 rows) ─────────────────────────────────
actions = ["upload","download","delete","share","login","logout","view","rename"]

with open("activity_logs_anomaly.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["log_id","user_id","action","file_id","timestamp","ip_address",
                     "file_size_mb","download_count_24h","login_attempts","anomaly_label"])
    for i in range(300):
        log_id = f"LOG{i+1:04d}"
        uid = f"U{random.randint(1,20):03d}"
        action = random.choice(actions)
        fid = f"F{random.randint(1,30):03d}"
        ts = random_date(90)
        ip = random_ip()
        size_mb = round(random.uniform(0.1, 500.0), 2)
        
        # ~10% anomalies
        is_anomaly = random.random() < 0.10
        if is_anomaly:
            dl_count = random.randint(51, 200)
            login_attempts = random.randint(11, 50)
        else:
            dl_count = random.randint(0, 49)
            login_attempts = random.randint(0, 9)
        
        anomaly = 1 if (login_attempts > 10 or dl_count > 50) else 0
        writer.writerow([log_id, uid, action, fid, ts, ip, size_mb, dl_count, login_attempts, anomaly])

print("✓ activity_logs_anomaly.csv")

# ─── 3. file_metadata_classification.csv (150 rows) ──────────────────────────
ext_map = {
    "document": [".pdf",".docx",".txt",".odt",".rtf"],
    "image":    [".jpg",".png",".gif",".bmp",".webp"],
    "video":    [".mp4",".avi",".mov",".mkv",".webm"],
    "code":     [".py",".js",".ts",".java",".cpp",".go"],
    "data":     [".csv",".json",".xml",".xlsx",".parquet"],
    "archive":  [".zip",".tar",".gz",".rar",".7z"],
}
labels = list(ext_map.keys())

with open("file_metadata_classification.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["file_id","extension","size_kb","has_text","has_binary","entropy","label"])
    for i in range(150):
        label = random.choice(labels)
        ext = random.choice(ext_map[label])
        size_kb = round(random.uniform(1.0, 50000.0), 2)
        has_text = 1 if label in ["document","code","data"] else 0
        has_binary = 1 if label in ["image","video","archive"] else 0
        # entropy varies by type
        base_entropy = {"document":4.5,"image":7.2,"video":7.8,"code":4.1,"data":3.8,"archive":7.9}
        entropy = round(base_entropy[label] + random.uniform(-0.5, 0.5), 4)
        fid = f"F{i+1:03d}"
        writer.writerow([fid, ext, size_kb, has_text, has_binary, entropy, label])

print("✓ file_metadata_classification.csv")

# ─── 4. node_performance.csv (100 rows) ──────────────────────────────────────
regions = ["us-east","us-west","eu-central","ap-south"]
nodes = [f"N{i:03d}" for i in range(1,9)]

with open("node_performance.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["node_id","region","cpu_pct","ram_pct","bandwidth_mbps",
                     "latency_ms","active_connections","predicted_latency_ms"])
    for i in range(100):
        node = random.choice(nodes)
        region = random.choice(regions)
        cpu = round(random.uniform(5.0, 95.0), 1)
        ram = round(random.uniform(10.0, 90.0), 1)
        bw = round(random.uniform(10.0, 1000.0), 1)
        latency = round(random.uniform(5.0, 200.0), 2)
        connections = random.randint(0, 500)
        # predicted latency: higher load → higher latency
        predicted = round(latency * (1 + cpu/200 + ram/300) + connections*0.05, 2)
        writer.writerow([node, region, cpu, ram, bw, latency, connections, predicted])

print("✓ node_performance.csv")
print("\n✅ All 4 datasets generated successfully!")
