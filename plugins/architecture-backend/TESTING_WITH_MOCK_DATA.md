# Testing Architecture Plugin with Mock Data

## Overview

Since we don't have access to real repositories in this environment, we've created comprehensive mock data that simulates a realistic banking microservices architecture.

## Mock Data Structure

### Bounded Contexts (5 Systems)
1. **payment-core** - Payment processing
2. **account-management** - Account operations
3. **customer-management** - Customer profiles and KYC
4. **loan-origination** - Loan applications
5. **transaction-processing** - Transaction history

### Components (7 Services)
- payment-gateway
- payment-validator
- account-service
- customer-service
- kyc-service
- loan-application-service
- transaction-service

### APIs (8 APIs)
- payment-gateway-api (OpenAPI)
- payment-validation-api (OpenAPI)
- account-api (OpenAPI)
- balance-inquiry-api (OpenAPI)
- customer-api (OpenAPI)
- kyc-verification-api (gRPC)
- loan-application-api (OpenAPI)
- transaction-history-api (OpenAPI)

### Expected Relationships
- Payment Core → Account Management (account-api, balance-inquiry-api)
- Payment Core → Transaction Processing (transaction-history-api)
- Account Management → Customer Management (customer-api)
- Account Management → Transaction Processing (transaction-history-api)
- Loan Origination → Customer Management (customer-api, kyc-verification-api)
- Loan Origination → Account Management (account-api)
- Customer Management → Customer Management (SHARED_KERNEL pattern)

## Loading Mock Data

### Option 1: Environment Variable (Easiest)

Set the environment variable to automatically load mock data:

```bash
# In app-config.yaml or your environment
export ARCHITECTURE_USE_MOCK_DATA=true

# Then restart the backend
yarn start-backend
```

The mock provider will automatically:
- Register with the catalog
- Load all 23 mock entities
- Make them available for context discovery
- Log a summary of loaded entities

Check the logs for:
```
MockArchitectureProvider: Loaded 23 mock entities
  - Domains: 3
  - Systems: 5
  - APIs: 8
  - Components: 7
```

### Option 2: Manual SQL Insert (Alternative)

1. **Generate the mock entities:**
```bash
curl http://localhost:7007/api/architecture/mock/entities > mock-entities.json
```

2. **Insert into database:**

You need to insert these entities into the `final_entities` table. Here's a helper script:

```bash
# Create SQL insert script
cat > insert-mock-data.sql << 'EOF'
-- Insert mock entities for context mapping testing
-- This simulates realistic catalog data

-- Clear existing test data (optional)
-- DELETE FROM final_entities WHERE entity_id LIKE 'domain:default/%' OR entity_id LIKE 'system:default/%';

-- Insert domains
INSERT INTO final_entities (entity_id, final_entity, hash, stitch_ticket)
VALUES 
  ('domain:default/payments', '{"apiVersion":"backstage.io/v1alpha1","kind":"Domain","metadata":{"name":"payments","title":"Payments Domain","description":"Payment processing and transaction management"},"spec":{"owner":"platform-team"}}', 'mock-hash-1', 'mock-ticket-1'),
  ('domain:default/banking-core', '{"apiVersion":"backstage.io/v1alpha1","kind":"Domain","metadata":{"name":"banking-core","title":"Banking Core Domain","description":"Core banking operations"},"spec":{"owner":"platform-team"}}', 'mock-hash-2', 'mock-ticket-2'),
  ('domain:default/lending', '{"apiVersion":"backstage.io/v1alpha1","kind":"Domain","metadata":{"name":"lending","title":"Lending Domain","description":"Loan origination and management"},"spec":{"owner":"platform-team"}}', 'mock-hash-3', 'mock-ticket-3')
ON CONFLICT (entity_id) DO UPDATE 
  SET final_entity = EXCLUDED.final_entity,
      hash = EXCLUDED.hash;

-- Note: Add all other entities similarly
-- For complete SQL, generate from the mock data
EOF

# Execute (adjust database connection as needed)
# psql $DATABASE_URL -f insert-mock-data.sql
```

### Option 2: Use Architecture Module Test Method

Add a test method to insert mock data programmatically:

```typescript
// In module.ts
async loadMockData() {
  // This would require write access to the database
  // Implementation depends on your catalog's entity ingestion mechanism
}
```

### Option 3: Programmatic Provider (Already Implemented!)

The mock provider is already implemented in `src/mockProvider.ts` and automatically loads when you set the environment variable (see Option 1).

If you want to always load mock data without the env variable, edit `src/module.ts` and change:

```typescript
if (process.env.ARCHITECTURE_USE_MOCK_DATA === 'true') {
```

to:

```typescript
if (true) { // Always load mock data
```

## Testing Endpoints

### 1. View Mock Data Summary
```bash
curl http://localhost:7007/api/architecture/mock/summary
```

Expected output:
```json
{
  "total": 23,
  "domains": 3,
  "systems": 5,
  "apis": 8,
  "components": 7,
  "boundedContexts": [
    {
      "id": "payment-core",
      "domain": "payments",
      "componentCount": 2,
      "apiCount": 2
    },
    ...
  ]
}
```

### 2. View Expected Context Map Structure
```bash
curl http://localhost:7007/api/architecture/mock/expected-context-map
```

This shows what the context map SHOULD look like after processing the mock data.

### 3. Test Context Discovery (After Loading Data)
```bash
# Get all contexts
curl http://localhost:7007/api/architecture/contexts

# Get full context map
curl http://localhost:7007/api/architecture/context-map

# Get specific context
curl http://localhost:7007/api/architecture/contexts/payment-core

# Get dependencies
curl http://localhost:7007/api/architecture/contexts/payment-core/dependencies
```

## Validation Checklist

After loading mock data, verify:

- [ ] 5 bounded contexts discovered (payment-core, account-management, customer-management, loan-origination, transaction-processing)
- [ ] 7 components grouped correctly by system
- [ ] 8 APIs linked to their systems
- [ ] Relationships detected:
  - [ ] payment-core ← account-management (OPEN_HOST_SERVICE)
  - [ ] payment-core ← transaction-processing (OPEN_HOST_SERVICE)
  - [ ] account-management ← customer-management (CUSTOMER_SUPPLIER)
  - [ ] loan-origination ← customer-management (OPEN_HOST_SERVICE for gRPC)
  - [ ] loan-origination ← account-management (CUSTOMER_SUPPLIER)
  - [ ] customer-management ← customer-management (SHARED_KERNEL - kyc-service consuming customer-api)
- [ ] GitHub URLs extracted (github.com/mybank/*)
- [ ] Relationship types correctly inferred (SHARED_KERNEL for same domain, OPEN_HOST_SERVICE for gRPC)

## Expected DDD Patterns

Based on the mock data:

1. **SHARED_KERNEL**: customer-management ↔ customer-management
   - kyc-service and customer-service share the same domain
   
2. **OPEN_HOST_SERVICE**: 
   - kyc-verification-api (gRPC) → Well-defined protocol
   
3. **CUSTOMER_SUPPLIER** (default):
   - Most REST API relationships

## Troubleshooting

### No Entities Returned
- Check that mock data is loaded into `final_entities` table
- Verify database connection in architecture module
- Check logs: `grep "Architecture:" backstage.log`

### No Relationships Found
- Verify components have `providesApis` and `consumesApis` specs
- Check that components are linked to systems via `spec.system`
- Ensure API entities exist with matching names

### Incorrect Grouping
- Confirm `spec.system` matches system entity names
- Check that system entities exist in catalog
- Verify domain annotations if using fallback grouping

## Cleanup

To remove mock data after testing:

```sql
DELETE FROM final_entities 
WHERE entity_id LIKE 'domain:default/payments%'
   OR entity_id LIKE 'domain:default/banking-core%'
   OR entity_id LIKE 'domain:default/lending%'
   OR entity_id LIKE 'system:default/payment-core%'
   OR entity_id LIKE 'system:default/account-management%'
   OR entity_id LIKE 'system:default/customer-management%'
   OR entity_id LIKE 'system:default/loan-origination%'
   OR entity_id LIKE 'system:default/transaction-processing%'
   OR entity_id LIKE 'api:default/payment-%'
   OR entity_id LIKE 'api:default/account-%'
   OR entity_id LIKE 'api:default/balance-%'
   OR entity_id LIKE 'api:default/customer-%'
   OR entity_id LIKE 'api:default/kyc-%'
   OR entity_id LIKE 'api:default/loan-%'
   OR entity_id LIKE 'api:default/transaction-%'
   OR entity_id LIKE 'component:default/payment-%'
   OR entity_id LIKE 'component:default/account-%'
   OR entity_id LIKE 'component:default/customer-%'
   OR entity_id LIKE 'component:default/kyc-%'
   OR entity_id LIKE 'component:default/loan-%'
   OR entity_id LIKE 'component:default/transaction-%';
```

## Next Steps

1. Choose loading method (Mock Provider recommended)
2. Load mock data
3. Test all endpoints
4. Validate context discovery
5. Verify relationship inference
6. Document any issues found
7. Enhance as needed based on results
