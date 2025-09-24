# Azure Cosmos DB Setup Instructions

## Prerequisites
- Azure subscription with appropriate permissions
- Azure CLI installed (✅ Confirmed: v2.77.0)

## Step 1: Authentication
```bash
# Login to Azure
az login

# Set the subscription (if you have multiple)
az account set --subscription "your-subscription-id"

# Verify login
az account show
```

## Step 2: Create Azure Resources

### Resource Group
```bash
az group create --name VailScavengerHuntRG --location "West US 2"
```

### Cosmos DB Account
```bash
az cosmosdb create \
  --name vail-scavenger-hunt-cosmos \
  --resource-group VailScavengerHuntRG \
  --capabilities EnableServerless \
  --default-consistency-level Session \
  --locations regionName="West US 2"
```

## Step 3: Get Connection Details
```bash
# Get endpoint (remove quotes from output)
az cosmosdb show --name vail-scavenger-hunt-cosmos --resource-group VailScavengerHuntRG --query documentEndpoint -o tsv

# Get primary key (remove quotes from output)
az cosmosdb keys list --name vail-scavenger-hunt-cosmos --resource-group VailScavengerHuntRG --query primaryMasterKey -o tsv

# Optional: Get connection string
az cosmosdb keys list --name vail-scavenger-hunt-cosmos --resource-group VailScavengerHuntRG --type connection-strings --query "connectionStrings[0].connectionString" -o tsv
```

## Step 4: Configure Environment Variables
```bash
# Copy the template
cp .env.cosmos.template .env

# Edit .env file with your actual values
# COSMOS_ENDPOINT=https://vail-scavenger-hunt-cosmos.documents.azure.com:443/
# COSMOS_KEY=your-actual-primary-key-here
```

## Step 5: Run Database Setup
```bash
# Install dependencies
npm install

# Run the setup script
npm run setup:cosmos
```

## Expected Results
- **Endpoint**: `https://vail-scavenger-hunt-cosmos.documents.azure.com:443/`
- **Primary Key**: [64-character base64 encoded key]
- **Database**: `vail-scavenger-hunt` created
- **Containers**: 4 containers with proper partitioning

## Security Best Practices
- Store connection strings in environment variables only
- Use Azure Key Vault for production environments
- Rotate keys regularly (Azure provides secondary key for rotation)
- Enable firewall rules to restrict access by IP
- Consider using Azure AD authentication for production

## Next Steps
1. Verify setup with `npm run setup:cosmos`
2. Proceed to User Story 002: Data Models & Types
3. Test connection from application