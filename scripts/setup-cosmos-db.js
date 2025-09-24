/**
 * Azure Cosmos DB Setup Script
 * Creates database and containers for Vail Scavenger Hunt application
 */

import { CosmosClient } from '@azure/cosmos';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function setupCosmosDB() {
  console.log('🚀 Starting Cosmos DB setup for Vail Scavenger Hunt...\n');

  // Validate environment variables
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;

  if (!endpoint || !key) {
    console.error('❌ Error: Missing required environment variables');
    console.error('   - COSMOS_ENDPOINT: Azure Cosmos DB endpoint URL');
    console.error('   - COSMOS_KEY: Azure Cosmos DB primary key');
    console.error('\nPlease set these variables in your .env file');
    process.exit(1);
  }

  try {
    // Initialize Cosmos client
    console.log('🔗 Connecting to Cosmos DB...');
    const client = new CosmosClient({ endpoint, key });

    // Create database
    console.log('📁 Creating database: vail-scavenger-hunt');
    const { database } = await client.databases.createIfNotExists({
      id: 'vail-scavenger-hunt'
    });
    console.log('✅ Database created/verified: vail-scavenger-hunt\n');

    // Container configurations
    const containers = [
      {
        id: 'teams',
        partitionKey: {
          paths: ['/organizationId'],
          kind: 'Hash'
        },
        indexingPolicy: {
          indexingMode: 'consistent',
          includedPaths: [{ path: '/*' }],
          excludedPaths: [{ path: '/_etag/?' }]
        },
        description: 'Team data and hunt progress'
      },
      {
        id: 'sessions',
        partitionKey: {
          paths: ['/sessionId'],
          kind: 'Hash'
        },
        defaultTtl: 86400, // 24 hours auto-expiration
        description: 'User sessions with 24-hour TTL'
      },
      {
        id: 'team-codes',
        partitionKey: {
          paths: ['/code'],
          kind: 'Hash'
        },
        uniqueKeyPolicy: {
          uniqueKeys: [{ paths: ['/code'] }]
        },
        description: 'Team code mappings with unique constraint'
      },
      {
        id: 'settings',
        partitionKey: {
          paths: ['/organizationId'],
          kind: 'Hash'
        },
        description: 'App settings per organization'
      }
    ];

    // Create each container
    for (const containerConfig of containers) {
      console.log(`📦 Creating container: ${containerConfig.id}`);
      console.log(`   Partition key: ${containerConfig.partitionKey.paths[0]}`);

      if (containerConfig.defaultTtl) {
        console.log(`   TTL: ${containerConfig.defaultTtl} seconds (24 hours)`);
      }

      if (containerConfig.uniqueKeyPolicy) {
        console.log(`   Unique constraint: ${containerConfig.uniqueKeyPolicy.uniqueKeys[0].paths[0]}`);
      }

      const containerSpec = {
        id: containerConfig.id,
        partitionKey: containerConfig.partitionKey
      };

      // Add optional properties
      if (containerConfig.indexingPolicy) {
        containerSpec.indexingPolicy = containerConfig.indexingPolicy;
      }

      if (containerConfig.defaultTtl) {
        containerSpec.defaultTtl = containerConfig.defaultTtl;
      }

      if (containerConfig.uniqueKeyPolicy) {
        containerSpec.uniqueKeyPolicy = containerConfig.uniqueKeyPolicy;
      }

      try {
        await database.containers.createIfNotExists(containerSpec);
        console.log(`✅ Container created/verified: ${containerConfig.id}`);
        console.log(`   ${containerConfig.description}\n`);
      } catch (error) {
        console.error(`❌ Failed to create container ${containerConfig.id}:`, error.message);
        throw error;
      }
    }

    // Verify setup
    console.log('🔍 Verifying setup...');
    const { resources: containerList } = await database.containers.readAll().fetchAll();

    console.log('📋 Container Summary:');
    containerList.forEach(container => {
      console.log(`   ✓ ${container.id}`);
    });

    console.log('\n🎉 Cosmos DB setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update your .env file with connection details');
    console.log('   2. Run the application to test connectivity');
    console.log('   3. Proceed to data migration when ready');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);

    if (error.code === 401) {
      console.error('   Check your COSMOS_KEY - it may be incorrect or expired');
    } else if (error.code === 'ENOTFOUND') {
      console.error('   Check your COSMOS_ENDPOINT - the URL may be incorrect');
    } else if (error.message.includes('quota')) {
      console.error('   You may have reached your Azure subscription limits');
    }

    console.error('\n💡 Troubleshooting:');
    console.error('   - Verify your Azure Cosmos DB account is running');
    console.error('   - Check environment variables in .env file');
    console.error('   - Ensure your Azure subscription is active');

    process.exit(1);
  }
}

// Run setup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupCosmosDB().catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });
}

export { setupCosmosDB };