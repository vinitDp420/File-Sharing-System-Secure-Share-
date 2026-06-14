# -*- coding: utf-8 -*-
import sys
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
"""
============================================================
  SecureShare - ML Algorithms Reference File
  Project   : Secure File Sharing System
  Subject   : Machine Learning (Sem 6)
  File      : algorithms.py
  Purpose   : Demonstrates all 4 ML algorithms used in the
              SecureShare ML Service with detailed comments.
============================================================

ALGORITHMS COVERED:
  1. TF-IDF + Cosine Similarity     → File Recommender
  2. Random Forest Classifier       → File Type Classifier
  3. Isolation Forest               → Anomaly Detector
  4. Gradient Boosting Regressor    → Smart Node Selector
"""

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor, IsolationForest
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_absolute_error, classification_report


# ==============================================================
# ALGORITHM 1: TF-IDF + Cosine Similarity (File Recommender)
# ==============================================================
"""
CONCEPT    : Content-Based Filtering
CATEGORY   : Recommendation System
HOW IT WORKS:
  - TF-IDF converts text (file tags, types) into numerical vectors.
  - TF  = How often a word appears in a document.
  - IDF = How rare that word is across all documents.
  - Cosine Similarity measures the angle between two vectors.
    → Score near 1.0 = Very similar files
    → Score near 0.0 = Very different files
USE CASE   : Recommend similar files to a user based on their access history.
"""

print("=" * 60)
print("ALGORITHM 1: TF-IDF + Cosine Similarity (Recommender)")
print("=" * 60)

# Sample file data
file_data = {
    'file_id':   ['F001', 'F002', 'F003', 'F004', 'F005'],
    'file_name': ['report.pdf', 'image.png', 'data.csv', 'notes.pdf', 'photo.jpg'],
    'file_type': ['pdf',        'image',     'csv',      'pdf',       'image'],
    'user_id':   ['U1',         'U2',        'U1',       'U3',        'U2'],
    'tags':      ['document finance', 'photo vacation', 'data analysis',
                  'document notes', 'photo nature'],
}
df_files = pd.DataFrame(file_data)

# Step 1: Combine file_type + tags into one content string
df_files['content'] = df_files['file_type'] + ' ' + df_files['tags']

# Step 2: Apply TF-IDF Vectorizer
tfidf = TfidfVectorizer()
tfidf_matrix = tfidf.fit_transform(df_files['content'])
print(f"\nTF-IDF Matrix Shape : {tfidf_matrix.shape}")
print(f"Vocabulary (words)  : {list(tfidf.vocabulary_.keys())}")

# Step 3: Compute Cosine Similarity
sim_matrix = cosine_similarity(tfidf_matrix)
print(f"\nCosine Similarity Matrix:\n{np.round(sim_matrix, 2)}")

# Step 4: Recommend files for User U1
user_id = 'U1'
user_files = df_files[df_files['user_id'] == user_id]
user_indices = user_files.index.tolist()
avg_scores = np.mean(sim_matrix[user_indices], axis=0)

already_seen = set(user_files.index)
scored = [(i, s) for i, s in enumerate(avg_scores) if i not in already_seen]
scored.sort(key=lambda x: x[1], reverse=True)

print(f"\nRecommendations for User '{user_id}':")
for idx, score in scored[:3]:
    print(f"  >> {df_files.iloc[idx]['file_name']}  (score: {score:.4f})")


# ==============================================================
# ALGORITHM 2: Random Forest Classifier (File Type Classifier)
# ==============================================================
"""
CONCEPT    : Supervised Classification / Ensemble Learning (Bagging)
CATEGORY   : Supervised Learning
HOW IT WORKS:
  - Builds multiple Decision Trees on random subsets of data.
  - Each tree gives a vote on the output class.
  - Final prediction = Majority vote of all trees.
  - More trees = more stable and accurate predictions.
USE CASE   : Classify uploaded files as 'document', 'image', 'video', etc.
"""

print("\n" + "=" * 60)
print("ALGORITHM 2: Random Forest Classifier (File Classifier)")
print("=" * 60)

# Sample file metadata
metadata = {
    'extension':  ['pdf', 'png', 'csv',  'mp4',  'docx', 'jpg',  'xlsx', 'exe'],
    'size_kb':    [200,   500,   50,     5000,   300,    400,    150,    1000],
    'has_text':   [1,     0,     1,      0,      1,      0,      1,      0],
    'has_binary': [0,     1,     0,      1,      0,      1,      0,      1],
    'entropy':    [4.2,   7.5,   3.1,    6.8,    4.0,    7.2,    3.5,    6.0],
    'label':      ['doc', 'img', 'data', 'video','doc',  'img',  'data', 'exec'],
}
df_meta = pd.DataFrame(metadata)

# Step 1: Label Encode the 'extension' column
le = LabelEncoder()
df_meta['ext_encoded'] = le.fit_transform(df_meta['extension'])

# Step 2: Define Features (X) and Target (y)
feature_cols = ['ext_encoded', 'size_kb', 'has_text', 'has_binary', 'entropy']
X = df_meta[feature_cols]
y = df_meta['label']

# Step 3: Train/Test Split (80% train, 20% test)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Step 4: Train Random Forest
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train, y_train)

# Step 5: Evaluate
y_pred = clf.predict(X_test)
print(f"\nModel         : Random Forest (100 trees)")
print(f"Training Size : {len(X_train)} samples")
print(f"Test Size     : {len(X_test)} samples")
print(f"Accuracy      : {accuracy_score(y_test, y_pred):.4f}")

print(f"\nFeature Importances:")
for feat, imp in zip(feature_cols, clf.feature_importances_):
    print(f"  {feat:<20} : {imp:.4f}")

# Step 6: Predict a new file
new_file = np.array([[le.transform(['pdf'])[0], 250, 1, 0, 4.3]])
prediction = clf.predict(new_file)[0]
proba = clf.predict_proba(new_file)[0]
print(f"\nPrediction for new file (pdf, 250KB):")
print(f"  Label      : {prediction}")
print(f"  Confidence : {max(proba):.4f}")


# ==============================================================
# ALGORITHM 3: Isolation Forest (Anomaly Detector)
# ==============================================================
"""
CONCEPT    : Unsupervised Anomaly Detection
CATEGORY   : Unsupervised Learning
HOW IT WORKS:
  - Randomly selects a feature and splits data between min and max values.
  - Anomalies are isolated faster (fewer splits needed).
  - Normal points need many splits to be isolated.
  - Anomaly Score: More negative = more anomalous.
  - Output:  1 = Normal,  -1 = Anomaly
USE CASE   : Detect suspicious user activity (too many logins, bulk downloads).
"""

print("\n" + "=" * 60)
print("ALGORITHM 3: Isolation Forest (Anomaly Detector)")
print("=" * 60)

# Sample activity logs
activity_data = {
    'user_id':             ['U1', 'U2', 'U3', 'U4', 'U5', 'U6'],
    'file_size_mb':        [1.2,  5.5,  0.8,  200.0, 2.1, 3.3],
    'download_count_24h':  [3,    10,   2,    150,   5,   8  ],
    'login_attempts':      [1,    2,    1,    50,    3,   2  ],
    'anomaly_label':       [0,    0,    0,    1,     0,   0  ],   # 1=anomaly
}
df_activity = pd.DataFrame(activity_data)

feature_cols = ['file_size_mb', 'download_count_24h', 'login_attempts']
X = df_activity[feature_cols]

# Step 1: Normalize features using StandardScaler
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Step 2: Train Isolation Forest
iso_forest = IsolationForest(
    n_estimators=100,      # Number of isolation trees
    contamination=0.1,     # Expected % of anomalies in dataset
    random_state=42
)
iso_forest.fit(X_scaled)

# Step 3: Predict anomalies
predictions = iso_forest.predict(X_scaled)  # 1=normal, -1=anomaly
scores = iso_forest.score_samples(X_scaled) # Lower = more anomalous

print(f"\nModel         : Isolation Forest (100 trees)")
print(f"Contamination : 10%  (1 in 10 users may be suspicious)")
print(f"\nResults:")  
for i, row in df_activity.iterrows():
    status = "[ANOMALY]" if predictions[i] == -1 else "[Normal] "
    print(f"  User {row['user_id']} | Downloads: {row['download_count_24h']:>3} | "
          f"Logins: {row['login_attempts']:>2} | Score: {scores[i]:>6.3f} | {status}")

# Step 4: Predict a new suspicious user
new_user = np.array([[180.0, 120, 45]])         # Large file, many downloads, many logins
new_scaled = scaler.transform(new_user)
result = iso_forest.predict(new_scaled)[0]
score  = iso_forest.score_samples(new_scaled)[0]
status_msg = 'ANOMALY DETECTED' if result == -1 else 'Normal'
print(f"\nNew User Check >> {status_msg} (score: {score:.4f})")


# ==============================================================
# ALGORITHM 4: Gradient Boosting Regressor (Smart Node Selector)
# ==============================================================
"""
CONCEPT    : Supervised Regression / Ensemble Learning (Boosting)
CATEGORY   : Supervised Learning
HOW IT WORKS:
  - Builds trees sequentially, each correcting errors of the previous.
  - Each new tree focuses on the residual errors (what was wrong).
  - Uses a learning_rate to control contribution of each tree.
  - Final prediction = Sum of all weak learners' outputs.
USE CASE   : Predict which network node has the lowest latency for file upload.
"""

print("\n" + "=" * 60)
print("ALGORITHM 4: Gradient Boosting Regressor (Node Selector)")
print("=" * 60)

# Sample node performance data
node_data = {
    'region':             ['us-east', 'eu-west', 'ap-south', 'us-west', 'eu-central', 'ap-east'],
    'cpu_pct':            [45,        70,         30,         80,        55,            40       ],
    'ram_pct':            [60,        75,         40,         85,        65,            50       ],
    'bandwidth_mbps':     [500,       200,        800,        150,       400,           600      ],
    'active_connections': [20,        50,         10,         80,        30,            15       ],
    'predicted_latency_ms': [25,      80,         15,         120,       45,            20       ],
}
df_nodes = pd.DataFrame(node_data)

# Step 1: Encode 'region' column
le_region = LabelEncoder()
df_nodes['region_encoded'] = le_region.fit_transform(df_nodes['region'])

# Step 2: Features and Target
feature_cols = ['region_encoded', 'cpu_pct', 'ram_pct', 'bandwidth_mbps', 'active_connections']
X = df_nodes[feature_cols]
y = df_nodes['predicted_latency_ms']

# Step 3: Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Step 4: Train Gradient Boosting Regressor
gb = GradientBoostingRegressor(
    n_estimators=100,      # Number of boosting stages (trees)
    learning_rate=0.1,     # Shrinkage rate – controls overfitting
    max_depth=3,           # Max depth of each individual tree
    random_state=42
)
gb.fit(X_train, y_train)

# Step 5: Evaluate
y_pred = gb.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
print(f"\nModel         : Gradient Boosting Regressor (100 stages)")
print(f"Learning Rate : 0.1")
print(f"Max Depth     : 3")
print(f"MAE           : {mae:.4f} ms")

print(f"\nFeature Importances:")
for feat, imp in zip(feature_cols, gb.feature_importances_):
    print(f"  {feat:<25} : {imp:.4f}")

# Step 6: Rank nodes by predicted latency (pick best node)
all_preds = gb.predict(X)
df_nodes['predicted_latency_ms'] = np.round(all_preds, 2)
df_sorted = df_nodes.sort_values('predicted_latency_ms')

print(f"\nRanked Nodes (Best → Worst latency):")
for _, row in df_sorted.iterrows():
    print(f"  {row['region']:<12} | CPU: {row['cpu_pct']}% | "
          f"RAM: {row['ram_pct']}% | Latency: {row['predicted_latency_ms']} ms")

best = df_sorted.iloc[0]
print(f"\n[BEST] Node Selected: {best['region']} ({best['predicted_latency_ms']} ms)")


# ==============================================================
# SUMMARY TABLE
# ==============================================================
print("\n" + "=" * 60)
print("SUMMARY: ML Algorithms in SecureShare")
print("=" * 60)
summary = {
    'Module':     ['File Recommender',    'File Classifier',   'Anomaly Detector',   'Node Selector'       ],
    'Algorithm':  ['TF-IDF + Cosine Sim', 'Random Forest',     'Isolation Forest',   'Gradient Boosting'   ],
    'Type':       ['Unsupervised',        'Supervised',        'Unsupervised',        'Supervised'          ],
    'Task':       ['Recommendation',      'Classification',    'Anomaly Detection',   'Regression'          ],
    'Metric':     ['Cosine Score',        'Accuracy',          'Anomaly Score',       'MAE (ms)'            ],
}
df_summary = pd.DataFrame(summary)
print(df_summary.to_string(index=False))
print("=" * 60)
