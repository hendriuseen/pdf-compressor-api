
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;
const { spawn } = require('child_process');
const upload = multer({ dest: 'uploads/' });
const jobs = {};

// Ensure necessary folders exist
const ensureDir = dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
};
ensureDir('uploads');
ensureDir('compressed');

// Allow CORS for Netlify frontend
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

//app.use(express.static('public'));

app.post('/', upload.single('file'), (req, res) => {
  console.log("📥 File received:", req.file?.originalname || "none");

  if (!req.file || fs.statSync(req.file.path).size === 0) {
    console.error("❌ Uploaded file is empty or missing.");
    return res.status(400).send("Empty file.");
  }
  const jobId = uuidv4();
  //const inputPath = req.file.path;
  const originalName = req.file.originalname

  const inputPath = path.resolve(req.file.path); // in /uploads/
  const outputPath = path.resolve('compressed', `${jobId}.pdf`); // in /compressed/

  //const outputPath = `compressed/${req.file.originalname}-compressed.pdf`;
  //const outputPath = path.join('compressed/', `${jobId}.pdf`);
  jobs[jobId] = { status: 'processing', outputPath };
  //const gsCommand = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile=${outputPath} ${inputPath}`;

  const args = [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    '-dPDFSETTINGS=/screen',
    '-dNOPAUSE',
    '-dQUIET',
    '-dBATCH',
    '-dFastWebView=true',
    '-dNumRenderingThreads=4',
    `-sOutputFile=${outputPath}`,
    inputPath
  ];

  const gs = spawn('gs', args);
  
  console.log("▶️ Compressing:", req.file.originalname);


  gs.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Ghostscript failed with code ${code}`);
      jobs[jobId].status = 'failed';
    } else {
      console.log("✅ Compression complete:", outputPath);
      jobs[jobId].status = 'done';
      fs.unlinkSync(inputPath);
    }
  });
  res.json({ jobId });
});

//app.get('/status/:jobId', (req, res) => {
app.get('/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).send("Job not found");
  res.json({ status: job.status });
});

//app.get('/download/:jobId', (req, res) => {
app.get('/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!fs.existsSync(job.outputPath) || fs.statSync(job.outputPath).size < 1000) {
    console.error("❌ Compressed file is missing or too small.");
    return res.status(500).send("Compression failed.");
  }
  if (!job || job.status !== 'done') return res.status(404).send("File not ready");
  res.download(job.outputPath, 'compressed.pdf', () => {
    fs.unlinkSync(job.outputPath); // Cleanup after download
    delete jobs[req.params.jobId];
  });
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
