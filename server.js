const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Define the path to the Downloads folder (UserLAnd environment)
const downloadsDir = path.join(process.env.HOME, 'storage', 'downloads');

// Ensure the Downloads folder exists
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Enable file uploads
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from public

// Serve index.html from the root directory
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route to display files in the Downloads folder
app.get('/files', (req, res) => {
  fs.readdir(downloadsDir, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return res.status(500).send('Unable to scan directory');
    }
    res.json(files);
  });
});

// Route to download a specific file
app.get('/download/:filename', (req, res) => {
  const file = path.join(downloadsDir, req.params.filename);
  console.log('Download path:', file);  // Log the path for debugging
  res.download(file, (err) => {
    if (err) {
      console.error('File not found:', err);
      res.status(404).send('File not found');
    }
  });
});

// Route to upload a file to the Downloads folder
app.post('/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const file = req.files.file;
  const uploadPath = path.join(downloadsDir, file.name);

  console.log('Upload path:', uploadPath);  // Log the path for debugging

  file.mv(uploadPath, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(500).send(err);
    }
    res.send('File uploaded successfully!');
  });
});

// Route to delete a specific file
app.delete('/delete/:filename', (req, res) => {
  const file = path.join(downloadsDir, req.params.filename);
  fs.unlink(file, (err) => {
    if (err) {
      console.error('Delete error:', err);
      return res.status(500).send('Error deleting file');
    }
    res.send('File deleted successfully!');
  });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}/`);
});
