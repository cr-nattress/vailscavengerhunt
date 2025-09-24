/**
 * Validate Cosmos DB Setup
 * This script tests the setup without requiring actual Azure credentials
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Validating Cosmos DB Setup Configuration...\n');

// Check environment variables
const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;

console.log('📋 Environment Variables Status:');
console.log(`   COSMOS_ENDPOINT: ${endpoint ? '✅ Set' : '❌ Missing'}`);
console.log(`   COSMOS_KEY: ${key ? '✅ Set' : '❌ Missing'}`);

if (endpoint && key) {
  console.log('\n✅ Environment configuration looks good!');
  console.log('🚀 You can now run: npm run setup:cosmos');
} else {
  console.log('\n⚠️  Setup required:');
  console.log('   1. Copy: cp .env.cosmos.template .env');
  console.log('   2. Edit .env with your actual Azure credentials');
  console.log('   3. Run: npm run setup:cosmos');
}

// Validate Azure Cosmos SDK availability
try {
  const cosmos = await import('@azure/cosmos');
  console.log('\n📦 Dependencies:');
  console.log('   ✅ @azure/cosmos package available');
} catch (error) {
  console.log('\n📦 Dependencies:');
  console.log('   ❌ @azure/cosmos package missing');
  console.log('   Run: npm install @azure/cosmos');
}

console.log('\n📚 Documentation:');
console.log('   Setup Instructions: docs/AZURE_SETUP_INSTRUCTIONS.md');
console.log('   Environment Template: .env.cosmos.template');