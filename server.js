const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const app = express();
const port = 3000;
const password = process.env.FILE_MANAGER_PASSWORD || 'admin';
const tokenSecret = crypto.randomBytes(64).toString('hex');

// Define the path to the Downloads folder (UserLAnd environment)
const downloadsDir = path.join(process.env.HOME, 'storage', 'downloads');

// Ensure the Downloads folder exists
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Middleware
app.use(express.json());
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token === tokenSecret) {
      next();
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } else {
    res.status(401).json({ error: 'Authorization header missing' });
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/login', (req, res) => {
  const { password: inputPassword } = req.body;
  if (inputPassword === password) {
    res.json({ success: true, token: tokenSecret });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

app.get('/server-info', (req, res) => {
  const networkInterfaces = os.networkInterfaces();
  let ipAddress = 'localhost';
  
  // Find the first non-internal IPv4 address
  Object.keys(networkInterfaces).some(ifname => {
    return networkInterfaces[ifname].some(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        ipAddress = iface.address;
        return true;
      }
      return false;
    });
  });

  res.json({ url: `http://${ipAddress}:${port}` });
});

app.get('/files', authenticate, (req, res) => {
  fs.readdir(downloadsDir, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return res.status(500).send('Unable to scan directory');
    }
    res.json(files);
  });
});

app.get('/download/:filename', authenticate, (req, res) => {
  const file = path.join(downloadsDir, req.params.filename);
  res.download(file, (err) => {
    if (err) {
      console.error('File not found:', err);
      res.status(404).send('File not found');
    }
  });
});

app.post('/upload', authenticate, (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const file = req.files.file;
  const uploadPath = path.join(downloadsDir, file.name);

  file.mv(uploadPath, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(500).send(err);
    }
    res.send('File uploaded successfully!');
  });
});

app.delete('/delete/:filename', authenticate, (req, res) => {
  const file = path.join(downloadsDir, req.params.filename);
  fs.unlink(file, (err) => {
    if (err) {
      console.error('Delete error:', err);
      return res.status(500).send('Error deleting file');
    }
    res.send('File deleted successfully!');
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}/`);
});