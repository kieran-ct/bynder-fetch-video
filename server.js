const express = require('express');
const cors = require('cors');
const { getStreamableVideosBySku, startBackgroundRefresh } = require('./bynderService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get streamable videos by SKU
app.get('/videos/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    
    if (!sku) {
      return res.status(400).json({ error: 'SKU parameter is required' });
    }

    console.log(`📡 API request for SKU: ${sku}`);
    const videos = await getStreamableVideosBySku(sku);
    
    res.json({
      sku,
      count: videos.length,
      videos,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching videos:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Bynder Video API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      videos: '/videos/:sku'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Bynder Video Service running on port ${PORT}`);
  console.log(`📡 API available at: http://localhost:${PORT}/videos/:sku`);
  
  // Start background cache refresh
  startBackgroundRefresh();
});