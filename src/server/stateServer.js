import express from 'express';
import cors from 'cors';

// Initialize Express app
const app = express();
const PORT = process.env.STATE_PORT || 3002;

// In-memory state store
const stateStore = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * GET /api/state/:key
 * Retrieves a value by its key
 */
app.get('/api/state/:key', (req, res) => {
  const { key } = req.params;
  
  if (!key) {
    return res.status(400).json({ 
      error: 'Key parameter is required' 
    });
  }
  
  if (!stateStore.has(key)) {
    return res.status(404).json({ 
      error: 'Key not found',
      key 
    });
  }
  
  const value = stateStore.get(key);
  console.log(`✅ Retrieved key: ${key}`);
  
  res.json({
    key,
    value,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/state
 * Creates or updates a key-value pair
 * Body: { key: string, value: any }
 */
app.post('/api/state', (req, res) => {
  const { key, value } = req.body;
  
  if (!key) {
    return res.status(400).json({ 
      error: 'Key is required in request body' 
    });
  }
  
  if (value === undefined) {
    return res.status(400).json({ 
      error: 'Value is required in request body' 
    });
  }
  
  const isUpdate = stateStore.has(key);
  stateStore.set(key, value);
  
  console.log(`✅ ${isUpdate ? 'Updated' : 'Created'} key: ${key}`);
  
  res.status(isUpdate ? 200 : 201).json({
    message: isUpdate ? 'Value updated successfully' : 'Value created successfully',
    key,
    value,
    action: isUpdate ? 'update' : 'create',
    timestamp: new Date().toISOString()
  });
});

/**
 * DELETE /api/state/:key
 * Deletes a key-value pair
 */
app.delete('/api/state/:key', (req, res) => {
  const { key } = req.params;
  
  if (!key) {
    return res.status(400).json({ 
      error: 'Key parameter is required' 
    });
  }
  
  if (!stateStore.has(key)) {
    return res.status(404).json({ 
      error: 'Key not found',
      key 
    });
  }
  
  stateStore.delete(key);
  console.log(`✅ Deleted key: ${key}`);
  
  res.json({
    message: 'Value deleted successfully',
    key,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/state
 * Lists all keys (with optional values)
 */
app.get('/api/state', (req, res) => {
  const { includeValues } = req.query;
  
  const keys = Array.from(stateStore.keys());
  
  if (includeValues === 'true') {
    const entries = Object.fromEntries(stateStore);
    res.json({
      count: stateStore.size,
      data: entries,
      timestamp: new Date().toISOString()
    });
  } else {
    res.json({
      count: stateStore.size,
      keys,
      timestamp: new Date().toISOString()
    });
  }
  
  console.log(`✅ Listed ${stateStore.size} keys`);
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    storeSize: stateStore.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * Clear all state (for development/testing)
 */
app.post('/api/state/clear', (req, res) => {
  const previousSize = stateStore.size;
  stateStore.clear();
  
  console.log(`⚠️ Cleared all state (${previousSize} entries removed)`);
  
  res.json({
    message: 'All state cleared',
    entriesCleared: previousSize,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 State Management Server running on http://localhost:${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET    /api/state/:key     - Get value by key`);
  console.log(`   POST   /api/state          - Create/update key-value`);
  console.log(`   DELETE /api/state/:key     - Delete key-value`);
  console.log(`   GET    /api/state          - List all keys`);
  console.log(`   POST   /api/state/clear    - Clear all state`);
  console.log(`   GET    /health             - Health check`);
});

export default app;