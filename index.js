
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ dest: 'uploads/' });

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

app.use(express.static('public'));

app.post('/', upload.single('file'), (req, res) => {
  console.log("📥 File received:", req.file?.originalname || "none");

  if (!req.file) {
    console.error("❌ No file uploaded");
    return res.status(400).send("No file uploaded");
  }

  const inputPath = req.file.path;
  const outputPath = `compressed/${req.file.originalname}-compressed.pdf`;


  const qpdfCommand = `qpdf --linearize ${inputPath} ${outputPath}`;

  console.log("▶️ Running command:", qpdfCommand);

  exec(qpdfCommand, (error, stdout, stderr) => {
    if (error) {
      console.error("❌ QPDF compression error:", error.message);
      console.error("STDERR:", stderr);
      console.error("STDOUT:", stdout);
      return res.status(500).send("Compression failed");
    }

    console.log("✅ Compression successful, sending file...");

    res.download(outputPath, 'compressed.pdf', () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  });
});

app.get('/', (req, res) => res.send('PDF Compressor API is running'));

app.listen(port, () => console.log(`Server listening on port ${port}`));
