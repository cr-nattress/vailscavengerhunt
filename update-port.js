#!/usr/bin/env node

/**
 * Simple script to update the API port in .env file
 * Usage: node update-port.js [PORT]
 * Example: node update-port.js 3003
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const newPort = process.argv[2];
if (!newPort) {
  console.log('Usage: node update-port.js [PORT]');
  console.log('Example: node update-port.js 3003');
  process.exit(1);
}

const envPath = path.join(__dirname, '.env');

try {
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update PORT
  envContent = envContent.replace(/^PORT=.*/m, `PORT=${newPort}`);
  
  // Update VITE_API_URL
  envContent = envContent.replace(/^VITE_API_URL=.*/m, `VITE_API_URL=http://localhost:${newPort}`);
  
  fs.writeFileSync(envPath, envContent);
  
  console.log(`✅ Updated .env file with port ${newPort}`);
  console.log('🔄 Restart your dev server to apply changes');
} catch (error) {
  console.error('❌ Error updating .env file:', error.message);
  process.exit(1);
}