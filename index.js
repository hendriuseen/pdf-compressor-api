
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const { spawn } = require('child_process');

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
  // const outputPath = `compressed/${req.file.filename}.pdf`;
  const outputPath = inputPath.replace(/\.pdf$/, '-compressed.pdf');

  //const gsCommand = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile=${outputPath} ${inputPath}`;

  const gs = spawn('gs', [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    '-dPDFSETTINGS=/ebook',
    '-dNOPAUSE',
    '-dQUIET',
    '-dBATCH',
    `-sOutputFile=${outputPath}`,
    inputPath
  ]);

  gs.on('error', err => {
    console.error('Ghostscript failed to start:', err);
    res.status(500).send('Compression failed (gs not found or error starting)');
  });

  gs.on('close', code => {
    if (code !== 0) {
      console.error(`Ghostscript exited with code ${code}`);
      return res.status(500).send('Compression failed');
    }

    res.download(outputPath, 'compressed.pdf', err => {
      if (err) {
        console.error('Failed to send file:', err);
        res.status(500).send('Failed to send file');
      }
    });
  });
});

app.get('/', (req, res) => res.send('PDF Compressor API is running'));

app.listen(port, () => console.log(`Server listening on port ${port}`));
