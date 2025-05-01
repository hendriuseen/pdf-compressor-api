const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));

app.post('/compress', upload.single('file'), (req, res) => {
  const inputPath = req.file.path;
  const outputPath = `compressed/${req.file.filename}.pdf`;

  const gsCommand = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile=${outputPath} ${inputPath}`;

  exec(gsCommand, (error) => {
    if (error) {
      console.error('Compression error:', error);
      return res.status(500).send('Compression failed');
    }

    res.download(outputPath, 'compressed.pdf', () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  });
});

app.get('/', (req, res) => res.send('PDF Compressor API is running'));

app.listen(port, () => console.log(`Server listening on port ${port}`));
