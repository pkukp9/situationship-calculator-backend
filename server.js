require('dotenv').config({ path: '.env.local' });
const express = require('express');
const analyzeText = require('./api/analyze-text.js');
const analyzeScreenshot = require('./api/analyze-screenshot.js');

const app = express();
app.use(express.json());

// Add CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Add request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Mock req and res for Vercel serverless functions
const createMockRes = () => {
  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.data = data;
      return this;
    },
    setHeader: function(name, value) {
      if (!this.headers) this.headers = {};
      this.headers[name] = value;
    },
    end: function() {
      return this;
    },
    getHeader: function(name) {
      return this.headers ? this.headers[name] : null;
    }
  };
  return res;
};

app.post('/api/analyze-text', async (req, res) => {
  try {
    console.log('Received analyze-text request:', req.body);
    
    const mockRes = createMockRes();
    await analyzeText(req, mockRes);
    
    if (mockRes.headers) {
      Object.entries(mockRes.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }
    
    console.log('Sending response:', mockRes.data);
    res.status(mockRes.statusCode || 200).json(mockRes.data);
  } catch (error) {
    console.error('Error in analyze-text:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/analyze-screenshot', async (req, res) => {
  try {
    console.log('Received analyze-screenshot request:', req.body);
    
    const mockRes = createMockRes();
    await analyzeScreenshot(req, mockRes);
    
    if (mockRes.headers) {
      Object.entries(mockRes.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }
    
    console.log('Sending response:', mockRes.data);
    res.status(mockRes.statusCode || 200).json(mockRes.data);
  } catch (error) {
    console.error('Error in analyze-screenshot:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
}); 