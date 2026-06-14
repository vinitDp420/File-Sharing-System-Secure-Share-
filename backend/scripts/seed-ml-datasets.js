/**
 * seed-ml-datasets.js
 * Generates 1000 synthetic records for each of the 4 ML datasets
 * and saves them to BOTH:
 *   - CSV files (datasets/ folder — used by ML service Python models)
 *   - MongoDB collections (used for real-time queries & admin dashboard)
 *
 * Run: node scripts/seed-ml-datasets.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs       = require('fs');
const path     = require('path');

const {
  FileAccessHistory,
  MLActivityLog,
  FileMetaClassify,
  NodePerformance,
} = require('../models/MLDataset');

const DATASETS_DIR = path.join(__dirname, '../../datasets');
const MONGO_URI    = process.env.MONGO_URI || 'mongodb://localhost:27017/secureshare';
const ROWS         = 1000;

// ── Utilities ─────────────────────────────────────────────────────────────────
const rnd     = (min, max)       => Math.random() * (max - min) + min;
const rndInt  = (min, max)       => Math.floor(rnd(min, max + 1));
const pick    = (arr)            => arr[rndInt(0, arr.length - 1)];
const rndDate = (daysAgo = 365)  => new Date(Date.now() - rndInt(0, daysAgo) * 86400000 - rndInt(0, 86400000));
const rndIp   = ()               => `${rndInt(1,255)}.${rndInt(0,255)}.${rndInt(0,255)}.${rndInt(0,255)}`;
const csvEscape = (v)            => `"${String(v).replace(/"/g,'""')}"`;

function writeCSV(filename, headers, rows) {
  const filePath = path.join(DATASETS_DIR, filename);
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => r[h] ?? '').join(',')),
  ];
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log(`  ✓ ${filename} (${rows.length} rows) → ${filePath}`);
}

// ── Dataset 1: File Access History (Recommender) ──────────────────────────────
function generateFileAccessHistory() {
  const fileTypes   = ['pdf','image','video','code','spreadsheet','audio','archive'];
  const fileNames   = {
    pdf:         ['report','invoice','manual','thesis','summary','guide','brochure','policy'],
    image:       ['photo','screenshot','diagram','chart','scan','portrait','banner','logo'],
    video:       ['demo','tutorial','presentation','recording','clip','tour','webinar','promo'],
    code:        ['main','utils','config','tests','api','schema','helper','service'],
    spreadsheet: ['budget','sales','data','tracker','metrics','forecast','inventory','payroll'],
    audio:       ['podcast','meeting','interview','lecture','song','voicemail'],
    archive:     ['backup','release','project','assets','logs','export'],
  };
  const tagsPool = ['finance','engineering','media','education','personal','project','research','hr','legal','marketing'];

  const rows = [];
  const docs = [];

  for (let i = 0; i < ROWS; i++) {
    const ftype = pick(fileTypes);
    const fnameBase = pick(fileNames[ftype]);
    const ext  = ftype === 'spreadsheet' ? 'xlsx' : ftype === 'image' ? pick(['jpg','png','webp']) : ftype === 'video' ? pick(['mp4','mkv','mov']) : ftype === 'audio' ? pick(['mp3','wav','m4a']) : ftype === 'archive' ? pick(['zip','tar','gz']) : ftype === 'code' ? pick(['py','js','ts','java']) : 'pdf';
    const uid  = `U${String(rndInt(1,50)).padStart(3,'0')}`;
    const fid  = `F${String(rndInt(1,100)).padStart(3,'0')}`;
    const access = rndInt(1, 200);
    const lastAccessed = rndDate(180);
    const tags = Array.from(new Set([pick(tagsPool), pick(tagsPool), pick(tagsPool)])).slice(0, rndInt(1,3));

    rows.push({
      user_id: uid, file_id: fid,
      file_name: `${fnameBase}_${rndInt(1,99)}.${ext}`,
      file_type: ftype, access_count: access,
      last_accessed: lastAccessed.toISOString(), tags: tags.join(','),
    });

    docs.push({
      userId: uid, fileId: fid,
      fileName: `${fnameBase}_${rndInt(1,99)}.${ext}`,
      fileType: ftype, accessCount: access,
      lastAccessed, tags,
    });
  }

  writeCSV('file_access_history.csv',
    ['user_id','file_id','file_name','file_type','access_count','last_accessed','tags'],
    rows);

  return docs;
}

// ── Dataset 2: Activity Logs / Anomaly Detection ──────────────────────────────
function generateActivityLogs() {
  const actions = ['upload','download','delete','share','login','logout','view','rename','copy','move'];

  const rows = [];
  const docs = [];

  for (let i = 0; i < ROWS; i++) {
    const uid     = `U${String(rndInt(1,50)).padStart(3,'0')}`;
    const action  = pick(actions);
    const fid     = `F${String(rndInt(1,100)).padStart(3,'0')}`;
    const ts      = rndDate(90);
    const sizeMb  = parseFloat(rnd(0.1, 500).toFixed(2));
    const logId   = `LOG${String(i + 1).padStart(5,'0')}`;

    // ~10% anomalies, skewed distributions
    const isAnomaly = Math.random() < 0.10;
    const dlCount   = isAnomaly ? rndInt(51, 300)  : rndInt(0, 50);
    const loginAtt  = isAnomaly ? rndInt(11, 60)   : rndInt(0, 9);
    const anomaly   = (loginAtt > 10 || dlCount > 50) ? 1 : 0;

    rows.push({
      log_id: logId, user_id: uid, action, file_id: fid,
      timestamp: ts.toISOString(), ip_address: rndIp(),
      file_size_mb: sizeMb, download_count_24h: dlCount,
      login_attempts: loginAtt, anomaly_label: anomaly,
    });

    docs.push({
      logId, userId: uid, action, fileId: fid,
      timestamp: ts, ipAddress: rndIp(),
      fileSizeMb: sizeMb, downloadCount24h: dlCount,
      loginAttempts: loginAtt, anomalyLabel: anomaly,
    });
  }

  writeCSV('activity_logs_anomaly.csv',
    ['log_id','user_id','action','file_id','timestamp','ip_address','file_size_mb','download_count_24h','login_attempts','anomaly_label'],
    rows);

  return docs;
}

// ── Dataset 3: File Metadata Classification ───────────────────────────────────
function generateFileMetadata() {
  const extMap = {
    document: ['.pdf','.docx','.txt','.odt','.rtf','.pptx'],
    image:    ['.jpg','.png','.gif','.bmp','.webp','.svg'],
    video:    ['.mp4','.avi','.mov','.mkv','.webm','.flv'],
    code:     ['.py','.js','.ts','.java','.cpp','.go','.rs','.php'],
    data:     ['.csv','.json','.xml','.xlsx','.parquet','.yaml'],
    archive:  ['.zip','.tar','.gz','.rar','.7z','.bz2'],
    audio:    ['.mp3','.wav','.m4a','.flac','.ogg'],
    executable:['.exe','.dll','.sh','.bat','.apk','.dmg'],
  };
  const baseEntropy = {
    document:4.5, image:7.2, video:7.8, code:4.1,
    data:3.8, archive:7.9, audio:7.0, executable:6.5,
  };
  const textLabels     = new Set(['document','code','data']);
  const binaryLabels   = new Set(['image','video','archive','audio','executable']);

  const rows = [];
  const docs = [];

  for (let i = 0; i < ROWS; i++) {
    const label    = pick(Object.keys(extMap));
    const ext      = pick(extMap[label]);
    const sizeKb   = parseFloat(rnd(1, 100000).toFixed(2));
    const hasText   = textLabels.has(label)   ? 1 : 0;
    const hasBinary = binaryLabels.has(label) ? 1 : 0;
    const entropy   = parseFloat((baseEntropy[label] + rnd(-0.8, 0.8)).toFixed(4));
    const fid       = `F${String(i + 1).padStart(4,'0')}`;

    rows.push({ file_id: fid, extension: ext, size_kb: sizeKb, has_text: hasText, has_binary: hasBinary, entropy, label });
    docs.push({ fileId: fid, extension: ext.replace('.',''), sizeKb, hasText, hasBinary, entropy, label });
  }

  writeCSV('file_metadata_classification.csv',
    ['file_id','extension','size_kb','has_text','has_binary','entropy','label'],
    rows);

  return docs;
}

// ── Dataset 4: Node Performance ───────────────────────────────────────────────
function generateNodePerformance() {
  const regions = ['us-east','us-west','eu-central','ap-south','ap-northeast','sa-east'];
  const nodes   = Array.from({ length: 12 }, (_, i) => `N${String(i+1).padStart(3,'0')}`);

  const rows = [];
  const docs = [];

  for (let i = 0; i < ROWS; i++) {
    const nodeId      = pick(nodes);
    const region      = pick(regions);
    const cpu         = parseFloat(rnd(2, 98).toFixed(1));
    const ram         = parseFloat(rnd(5, 95).toFixed(1));
    const bw          = parseFloat(rnd(10, 10000).toFixed(1));
    const latency     = parseFloat(rnd(1, 300).toFixed(2));
    const connections = rndInt(0, 1000);
    // Predicted latency formula: higher load → higher latency
    const predicted   = parseFloat((latency * (1 + cpu/200 + ram/300) + connections * 0.05).toFixed(2));
    const recordedAt  = rndDate(30);

    rows.push({
      node_id: nodeId, region, cpu_pct: cpu, ram_pct: ram,
      bandwidth_mbps: bw, latency_ms: latency,
      active_connections: connections, predicted_latency_ms: predicted,
    });

    docs.push({
      nodeId, region, cpuPct: cpu, ramPct: ram,
      bandwidthMbps: bw, latencyMs: latency,
      activeConnections: connections, predictedLatencyMs: predicted,
      recordedAt,
    });
  }

  writeCSV('node_performance.csv',
    ['node_id','region','cpu_pct','ram_pct','bandwidth_mbps','latency_ms','active_connections','predicted_latency_ms'],
    rows);

  return docs;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected\n');

  console.log(`📊 Generating ${ROWS} rows per dataset...\n`);

  // Generate all data
  const accessDocs   = generateFileAccessHistory();
  const activityDocs = generateActivityLogs();
  const metaDocs     = generateFileMetadata();
  const nodeDocs     = generateNodePerformance();

  // Save to MongoDB (clear old seed data first)
  console.log('\n💾 Saving to MongoDB...');

  await FileAccessHistory.deleteMany({ userId: /^U\d{3}$/ });
  await FileAccessHistory.insertMany(accessDocs, { ordered: false });
  console.log(`  ✓ FileAccessHistory  — ${accessDocs.length} docs`);

  await MLActivityLog.deleteMany({ logId: /^LOG\d{5}$/ });
  await MLActivityLog.insertMany(activityDocs, { ordered: false });
  console.log(`  ✓ MLActivityLog      — ${activityDocs.length} docs`);

  await FileMetaClassify.deleteMany({ fileId: /^F\d{4}$/ });
  await FileMetaClassify.insertMany(metaDocs, { ordered: false });
  console.log(`  ✓ FileMetaClassify   — ${metaDocs.length} docs`);

  await NodePerformance.deleteMany({});
  await NodePerformance.insertMany(nodeDocs, { ordered: false });
  console.log(`  ✓ NodePerformance    — ${nodeDocs.length} docs`);

  console.log('\n─────────────────────────────────────────────────');
  console.log('  Collection            Docs    CSV');
  console.log('─────────────────────────────────────────────────');
  console.log(`  FileAccessHistory   ${ROWS}    file_access_history.csv`);
  console.log(`  MLActivityLog       ${ROWS}    activity_logs_anomaly.csv`);
  console.log(`  FileMetaClassify    ${ROWS}    file_metadata_classification.csv`);
  console.log(`  NodePerformance     ${ROWS}    node_performance.csv`);
  console.log('─────────────────────────────────────────────────');
  console.log(`\n🎉 Done! ${ROWS * 4} total records seeded successfully.\n`);
  console.log('💡 ML service will retrain automatically on next startup,');
  console.log('   or hit POST /ml/retrain to retrain now.\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
