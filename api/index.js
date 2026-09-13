const express = require('express');
const app = express();

app.use(express.json());

// API Test Rotası
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'M53G V8 Backend sorunsuz çalışıyor!' });
});

module.exports = app;
