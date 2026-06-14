import os
import sys

# Force UTF-8 output on Windows to allow emoji in print statements
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import json
import time
import threading
import numpy as np
import pandas as pd
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor, IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import (accuracy_score, classification_report,
                              confusion_matrix, mean_absolute_error)
import joblib

# ── App Setup ─────────────────────────────────────────────────────────────────
app = FastAPI(title="SecureShare ML Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DATASETS_DIR = Path(os.environ.get("DATASETS_DIR", "../datasets"))
MODELS_DIR = Path("models")
MODELS_DIR.mkdir(exist_ok=True)

# ── Global Model State ────────────────────────────────────────────────────────
models: Dict[str, Any] = {}
metrics: Dict[str, Any] = {}
training_status = {"status": "idle", "progress": 0, "message": ""}

# ── Pydantic Schemas ──────────────────────────────────────────────────────────
class RecommendRequest(BaseModel):
    user_id: str
    top_k: int = 5

class ClassifyRequest(BaseModel):
    extension: str
    size_kb: float
    has_text: int = 0
    has_binary: int = 0
    entropy: float = 4.5

class AnomalyRequest(BaseModel):
    user_id: str
    action: str
    file_size_mb: float
    download_count_24h: int
    login_attempts: int

class NodeRequest(BaseModel):
    nodes: List[Dict[str, Any]]

# ── Training Functions ────────────────────────────────────────────────────────
def train_recommender():
    """Cosine Similarity based file recommender"""
    try:
        df = pd.read_csv(DATASETS_DIR / "file_access_history.csv")
        # Build user-item matrix via TF-IDF on tags
        df['content'] = df['file_type'] + ' ' + df['tags'].fillna('')
        tfidf = TfidfVectorizer()
        tfidf_matrix = tfidf.fit_transform(df['content'])
        sim_matrix = cosine_similarity(tfidf_matrix)
        
        models['recommender'] = {
            'df': df, 'tfidf': tfidf,
            'tfidf_matrix': tfidf_matrix, 'sim_matrix': sim_matrix
        }
        metrics['recommender'] = {
            'model': 'Cosine Similarity (TF-IDF)',
            'training_samples': len(df),
            'unique_users': df['user_id'].nunique(),
            'unique_files': df['file_id'].nunique(),
            'status': 'ready'
        }
        print("✅ Recommender model trained")
        return True
    except Exception as e:
        print(f"❌ Recommender training failed: {e}")
        metrics['recommender'] = {'status': 'error', 'error': str(e)}
        return False

def train_classifier():
    """Random Forest file type classifier"""
    try:
        df = pd.read_csv(DATASETS_DIR / "file_metadata_classification.csv")
        le = LabelEncoder()
        df['ext_encoded'] = le.fit_transform(df['extension'])
        
        feature_cols = ['ext_encoded', 'size_kb', 'has_text', 'has_binary', 'entropy']
        X = df[feature_cols]
        y = df['label']
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        clf = RandomForestClassifier(n_estimators=100, random_state=42)
        clf.fit(X_train, y_train)
        
        y_pred = clf.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        report = classification_report(y_test, y_pred, output_dict=True)
        cm = confusion_matrix(y_test, y_pred).tolist()
        
        models['classifier'] = {'model': clf, 'label_encoder': le, 'feature_cols': feature_cols}
        metrics['classifier'] = {
            'model': 'Random Forest',
            'accuracy': round(acc, 4),
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'classes': list(le.classes_),
            'classification_report': report,
            'confusion_matrix': cm,
            'feature_importance': dict(zip(feature_cols, clf.feature_importances_.tolist())),
            'status': 'ready'
        }
        print(f"✅ Classifier trained | Accuracy: {acc:.4f}")
        return True
    except Exception as e:
        print(f"❌ Classifier training failed: {e}")
        metrics['classifier'] = {'status': 'error', 'error': str(e)}
        return False

def train_anomaly_detector():
    """Isolation Forest anomaly detector"""
    try:
        df = pd.read_csv(DATASETS_DIR / "activity_logs_anomaly.csv")
        feature_cols = ['file_size_mb', 'download_count_24h', 'login_attempts']
        X = df[feature_cols].fillna(0)
        
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        iso_forest = IsolationForest(n_estimators=100, contamination=0.1, random_state=42)
        iso_forest.fit(X_scaled)
        
        y_pred = iso_forest.predict(X_scaled)
        y_true = df['anomaly_label'].values
        anomaly_pred = (y_pred == -1).astype(int)
        acc = accuracy_score(y_true, anomaly_pred)
        
        models['anomaly'] = {'model': iso_forest, 'scaler': scaler, 'feature_cols': feature_cols}
        metrics['anomaly'] = {
            'model': 'Isolation Forest',
            'accuracy': round(acc, 4),
            'training_samples': len(X),
            'contamination': 0.1,
            'detected_anomalies': int(anomaly_pred.sum()),
            'status': 'ready'
        }
        print(f"✅ Anomaly detector trained | Accuracy: {acc:.4f}")
        return True
    except Exception as e:
        print(f"❌ Anomaly detector training failed: {e}")
        metrics['anomaly'] = {'status': 'error', 'error': str(e)}
        return False

def train_node_selector():
    """Gradient Boosting node latency predictor"""
    try:
        df = pd.read_csv(DATASETS_DIR / "node_performance.csv")
        le_region = LabelEncoder()
        df['region_encoded'] = le_region.fit_transform(df['region'])
        
        feature_cols = ['region_encoded', 'cpu_pct', 'ram_pct', 'bandwidth_mbps', 'active_connections']
        X = df[feature_cols]
        y = df['predicted_latency_ms']
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        gb = GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=3, random_state=42)
        gb.fit(X_train, y_train)
        
        y_pred = gb.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        
        models['node_selector'] = {'model': gb, 'label_encoder': le_region, 'feature_cols': feature_cols}
        metrics['node_selector'] = {
            'model': 'Gradient Boosting',
            'mae_ms': round(mae, 4),
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'feature_importance': dict(zip(feature_cols, gb.feature_importances_.tolist())),
            'status': 'ready'
        }
        print(f"✅ Node selector trained | MAE: {mae:.4f}ms")
        return True
    except Exception as e:
        print(f"❌ Node selector training failed: {e}")
        metrics['node_selector'] = {'status': 'error', 'error': str(e)}
        return False

def train_all_models(emit_progress=None):
    global training_status
    training_status = {"status": "training", "progress": 0, "message": "Starting..."}
    
    steps = [
        ("Recommender (Cosine Similarity)", train_recommender),
        ("Classifier (Random Forest)", train_classifier),
        ("Anomaly Detector (Isolation Forest)", train_anomaly_detector),
        ("Node Selector (Gradient Boosting)", train_node_selector),
    ]
    
    for i, (name, fn) in enumerate(steps):
        training_status["message"] = f"Training {name}..."
        training_status["progress"] = int((i / len(steps)) * 100)
        fn()
        training_status["progress"] = int(((i + 1) / len(steps)) * 100)
    
    training_status = {"status": "idle", "progress": 100, "message": "All models trained!"}
    print("[ML] All models trained successfully!")

# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    print("[ML] ML Service starting - training models...")
    thread = threading.Thread(target=train_all_models, daemon=True)
    thread.start()

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/ml/health")
def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "models": {k: v.get('status', 'unknown') for k, v in metrics.items()},
        "metrics": metrics,
        "training_status": training_status,
    }

@app.post("/ml/recommend")
def recommend_files(req: RecommendRequest):
    if 'recommender' not in models:
        raise HTTPException(503, "Recommender model not ready")
    
    m = models['recommender']
    df = m['df']
    sim_matrix = m['sim_matrix']
    tfidf_matrix = m['tfidf_matrix']
    
    # Get files accessed by this user
    user_files = df[df['user_id'] == req.user_id]
    
    if user_files.empty:
        # Cold start: return top files by access count
        top_files = df.nlargest(req.top_k, 'access_count')
        recommendations = top_files[['file_id', 'file_name', 'file_type', 'access_count', 'tags']].to_dict('records')
        return {"user_id": req.user_id, "recommendations": recommendations, "method": "popularity-based (cold start)"}
    
    # Get average similarity
    user_indices = user_files.index.tolist()
    avg_scores = np.mean(sim_matrix[user_indices], axis=0)
    
    # Exclude already accessed files
    already_accessed = set(user_files.index)
    scored = [(i, score) for i, score in enumerate(avg_scores) if i not in already_accessed]
    scored.sort(key=lambda x: x[1], reverse=True)
    
    top_indices = [idx for idx, _ in scored[:req.top_k]]
    recommendations = df.iloc[top_indices][['file_id', 'file_name', 'file_type', 'access_count', 'tags']].to_dict('records')
    
    return {"user_id": req.user_id, "recommendations": recommendations, "method": "cosine-similarity"}

@app.post("/ml/classify")
def classify_file(req: ClassifyRequest):
    if 'classifier' not in models:
        raise HTTPException(503, "Classifier model not ready")
    
    m = models['classifier']
    le = m['label_encoder']
    clf = m['model']
    
    try:
        ext_encoded = le.transform([req.extension])[0]
    except ValueError:
        ext_encoded = 0  # unknown extension
    
    features = np.array([[ext_encoded, req.size_kb, req.has_text, req.has_binary, req.entropy]])
    prediction = clf.predict(features)[0]
    probabilities = clf.predict_proba(features)[0]
    confidence = float(max(probabilities))
    
    return {
        "label": prediction,
        "confidence": round(confidence, 4),
        "probabilities": dict(zip(clf.classes_, [round(float(p), 4) for p in probabilities]))
    }

@app.post("/ml/anomaly")
def detect_anomaly(req: AnomalyRequest):
    if 'anomaly' not in models:
        raise HTTPException(503, "Anomaly model not ready")
    
    m = models['anomaly']
    iso_forest = m['model']
    scaler = m['scaler']
    
    features = np.array([[req.file_size_mb, req.download_count_24h, req.login_attempts]])
    scaled = scaler.transform(features)
    score = iso_forest.score_samples(scaled)[0]  # More negative = more anomalous
    prediction = iso_forest.predict(scaled)[0]  # -1 = anomaly, 1 = normal
    
    is_anomaly = prediction == -1
    # Map score to risk level
    if req.login_attempts > 20 or req.download_count_24h > 100:
        risk = "critical"
    elif req.login_attempts > 10 or req.download_count_24h > 50:
        risk = "high"
    elif is_anomaly:
        risk = "medium"
    else:
        risk = "low"
    
    return {
        "user_id": req.user_id,
        "is_anomaly": is_anomaly,
        "risk_level": risk,
        "anomaly_score": round(float(score), 4),
        "details": {
            "login_attempts": req.login_attempts,
            "download_count_24h": req.download_count_24h,
            "file_size_mb": req.file_size_mb,
        }
    }

@app.post("/ml/smart-node")
def select_smart_node(req: NodeRequest):
    if 'node_selector' not in models:
        raise HTTPException(503, "Node selector model not ready")
    
    m = models['node_selector']
    gb = m['model']
    le = m['label_encoder']
    
    results = []
    for node in req.nodes:
        try:
            region = node.get('region', 'us-east')
            try:
                region_enc = le.transform([region])[0]
            except ValueError:
                region_enc = 0
            
            features = np.array([[
                region_enc,
                node.get('cpu_pct', 50),
                node.get('ram_pct', 50),
                node.get('bandwidth_mbps', 100),
                node.get('active_connections', 10),
            ]])
            predicted_latency = gb.predict(features)[0]
            results.append({**node, 'predicted_latency_ms': round(float(predicted_latency), 2)})
        except Exception as e:
            results.append({**node, 'predicted_latency_ms': 999.0, 'error': str(e)})
    
    # Sort by predicted latency
    results.sort(key=lambda x: x['predicted_latency_ms'])
    return {"ranked_nodes": results, "best_node": results[0] if results else None}

@app.post("/ml/retrain")
def retrain_models(background_tasks: BackgroundTasks):
    if training_status['status'] == 'training':
        raise HTTPException(409, "Training already in progress")
    background_tasks.add_task(train_all_models)
    return {"message": "Retraining started in background"}

@app.get("/ml/training-status")
def get_training_status():
    return training_status

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
