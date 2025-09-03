/**
 * Test script for the State Management API
 * Run this after starting the state server with: npm run state-server:dev
 */

const API_BASE = 'http://localhost:3002/api';

async function testStateAPI() {
  console.log('🧪 Testing State Management API...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health check...');
    const healthResponse = await fetch('http://localhost:3002/health');
    const health = await healthResponse.json();
    console.log('✅ Health:', health);
    console.log();

    // Test 2: Set a value (create)
    console.log('2️⃣ Creating a new key-value pair...');
    const createResponse = await fetch(`${API_BASE}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        key: 'user:123', 
        value: { name: 'John Doe', age: 30, city: 'Vail' } 
      })
    });
    const createResult = await createResponse.json();
    console.log('✅ Create result:', createResult);
    console.log();

    // Test 3: Get the value
    console.log('3️⃣ Retrieving the value...');
    const getResponse = await fetch(`${API_BASE}/state/user:123`);
    const getResult = await getResponse.json();
    console.log('✅ Get result:', getResult);
    console.log();

    // Test 4: Update the value
    console.log('4️⃣ Updating the value...');
    const updateResponse = await fetch(`${API_BASE}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        key: 'user:123', 
        value: { name: 'John Doe', age: 31, city: 'Vail', updated: true } 
      })
    });
    const updateResult = await updateResponse.json();
    console.log('✅ Update result:', updateResult);
    console.log();

    // Test 5: Add another key
    console.log('5️⃣ Adding another key...');
    const secondResponse = await fetch(`${API_BASE}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        key: 'session:abc', 
        value: { 
          sessionId: 'abc123', 
          progress: { 'stop-1': true, 'stop-2': false },
          timestamp: new Date().toISOString()
        } 
      })
    });
    const secondResult = await secondResponse.json();
    console.log('✅ Second key result:', secondResult);
    console.log();

    // Test 6: List all keys
    console.log('6️⃣ Listing all keys...');
    const listResponse = await fetch(`${API_BASE}/state`);
    const listResult = await listResponse.json();
    console.log('✅ All keys:', listResult);
    console.log();

    // Test 7: List with values
    console.log('7️⃣ Listing all data...');
    const listValuesResponse = await fetch(`${API_BASE}/state?includeValues=true`);
    const listValuesResult = await listValuesResponse.json();
    console.log('✅ All data:', JSON.stringify(listValuesResult, null, 2));
    console.log();

    // Test 8: Try to get non-existent key
    console.log('8️⃣ Testing non-existent key...');
    const notFoundResponse = await fetch(`${API_BASE}/state/nonexistent`);
    console.log('✅ Status for missing key:', notFoundResponse.status);
    if (!notFoundResponse.ok) {
      const errorResult = await notFoundResponse.json();
      console.log('✅ Error result:', errorResult);
    }
    console.log();

    // Test 9: Delete a key
    console.log('9️⃣ Deleting a key...');
    const deleteResponse = await fetch(`${API_BASE}/state/session:abc`, {
      method: 'DELETE'
    });
    const deleteResult = await deleteResponse.json();
    console.log('✅ Delete result:', deleteResult);
    console.log();

    // Test 10: Final state check
    console.log('🔟 Final state check...');
    const finalResponse = await fetch(`${API_BASE}/state?includeValues=true`);
    const finalResult = await finalResponse.json();
    console.log('✅ Final state:', JSON.stringify(finalResult, null, 2));
    
    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Usage instructions
console.log('📋 To run this test:');
console.log('1. Start the state server: npm run state-server:dev');
console.log('2. Run this script: node test-state-api.js');
console.log('3. Or run with: node -e "import(\'./test-state-api.js\')"');
console.log();

// Auto-run if this script is executed directly
if (process.argv[1].endsWith('test-state-api.js')) {
  // Add a small delay to ensure server might be ready
  setTimeout(testStateAPI, 1000);
}