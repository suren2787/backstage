# Avro Schema Integration Analysis & Recommendations

## Executive Summary

Your Backstage implementation has successfully integrated Avro schema support following the same pattern as OpenAPI specifications. Avro schemas are now fetched from `/contracts/{bounded-context}/avro/*.avsc` files and ingested as **API entities** with `type: 'avro'`.

This document provides:
1. **Avro Schema Structure Overview** - Expected format and standards
2. **Current Implementation Analysis** - How schemas are processed
3. **Schema Display Recommendations** - Best practices for Backstage UI
4. **Sample Avro Schemas** - Real-world examples with explanations

---

## Part 1: Apache Avro Schema Basics

### What is Apache Avro?

Avro is a data serialization format that includes:
- **Schema Definition**: JSON-based format (`.avsc` files)
- **Binary Encoding**: Efficient wire format
- **Language Support**: Java, Python, Go, Node.js, C#, etc.
- **Use Cases**: Event streaming, command definitions, domain events

### Standard Avro Schema Structure

```json
{
  "type": "record",
  "namespace": "com.banking.payments",
  "name": "PaymentCommand",
  "doc": "Command to initiate a payment",
  "fields": [
    {
      "name": "commandId",
      "type": "string",
      "doc": "Unique command identifier"
    },
    {
      "name": "amount",
      "type": {
        "type": "decimal",
        "logicalType": "decimal",
        "precision": 18,
        "scale": 2
      },
      "doc": "Payment amount"
    },
    {
      "name": "currency",
      "type": {
        "type": "enum",
        "name": "CurrencyCode",
        "symbols": ["USD", "EUR", "GBP"]
      }
    },
    {
      "name": "sourceAccount",
      "type": ["null", "string"],
      "default": null,
      "doc": "Source account number (optional)"
    }
  ]
}
```

### Key Avro Type System

| Type | Example | Use Case |
|------|---------|----------|
| `string` | `"John"` | Text data |
| `bytes` | Binary data | Encryption, images |
| `int` | `42` | Small integers (-2³¹ to 2³¹-1) |
| `long` | `9223372036854775807` | Large integers |
| `float`/`double` | `3.14` | Decimal numbers |
| `boolean` | `true` | Flags |
| `null` | `null` | No value |
| `array` | `[1, 2, 3]` | Lists |
| `map` | `{"key": "value"}` | Key-value pairs |
| `record` | Named structured type | Composite objects |
| `enum` | `enum Gender {M, F}` | Fixed set of values |
| `union` | `["null", "string"]` | Optional fields |

### Logical Types (Extended Semantics)

```json
{
  "type": "string",
  "logicalType": "uuid"
},
{
  "type": "long",
  "logicalType": "timestamp-millis"
},
{
  "type": "bytes",
  "logicalType": "decimal",
  "precision": 10,
  "scale": 2
}
```

---

## Part 2: Your Current Implementation

### How Avro Schemas are Fetched

**File**: `plugins/static-data-backend/src/fetcher.ts`

```typescript
export async function fetchAllAvroSchemasFromContracts(
  github: GitHubConfig, 
  contractsPath = 'contracts'
): Promise<Array<{
  boundedContext: string;
  schemaName: string;
  filePath: string;
  rawSchema: string;
  parsedSchema?: any;
}>>
```

**Process**:
1. Lists all bounded contexts in `/contracts/`
2. For each context, looks for `/avro/` subdirectory
3. Filters `.avsc` files
4. Fetches raw schema content
5. Parses as JSON (if valid)
6. Returns array with parsed and raw schema

### How Avro Schemas are Ingested

**File**: `plugins/static-data-backend/src/provider.ts` (Lines 70-90)

```typescript
const avroSchemas = await fetchAllAvroSchemasFromContracts(github, 'contracts');
for (const schema of avroSchemas) {
  // Extract metadata from Avro schema
  let schemaType = schema.parsedSchema?.type || 'record';
  let schemaNamespace = schema.parsedSchema?.namespace || schema.boundedContext;
  
  // Create Backstage API entity
  const avroApiEntity = apiJsonToApiEntity({
    id: `${schema.boundedContext}-${schema.schemaName}`,
    name: `${schema.schemaName} (Avro)`,
    description: `Avro schema for bounded context ${schema.boundedContext}`,
    type: 'avro',  // ← API type set to 'avro'
    systemId: schema.boundedContext,
    tags: ['avro', schemaType],
    definition: schema.rawSchema,
  });
  entities.push(avroApiEntity);
}
```

### Resulting Backstage Entities

Each Avro schema becomes an **API Entity** in the catalog:

```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: payment-command
  title: PaymentCommand (Avro)
  description: Avro schema PaymentCommand for bounded context payment-core
spec:
  type: avro                    # ← Distinguishes from OpenAPI
  lifecycle: production
  owner: payments-squad
  system: payment-core          # ← Links to bounded context
  tags:
    - avro
    - record                     # ← Schema type
  definition: |
    {
      "type": "record",
      "namespace": "com.banking.payments",
      "name": "PaymentCommand",
      ...
    }
```

---

## Part 3: Recommended Avro File Structure

### Expected Directory Layout

```
contracts/
├── payment-core/
│   ├── openapi/
│   │   └── payment-gateway/
│   │       └── v1.0.yaml
│   └── avro/
│       ├── PaymentCommand.avsc
│       ├── PaymentEvent.avsc
│       └── PaymentStatus.avsc
├── account-management/
│   ├── openapi/
│   └── avro/
│       ├── AccountOpenedEvent.avsc
│       ├── AccountClosedEvent.avsc
│       └── BalanceUpdatedEvent.avsc
└── order-processing/
    ├── openapi/
    └── avro/
        ├── OrderCreatedEvent.avsc
        ├── OrderCommand.avsc
        └── ShipmentNotification.avsc
```

### Naming Conventions

**For Event Schemas**:
- `{DomainObject}Event.avsc` (e.g., `PaymentEvent.avsc`)
- Should capture past tense: "Payment**Completed**Event"
- Namespace: `com.{company}.{bounded-context}.events`

**For Command Schemas**:
- `{Action}Command.avsc` (e.g., `CreatePaymentCommand.avsc`)
- Should be imperative: "**Create**PaymentCommand"
- Namespace: `com.{company}.{bounded-context}.commands`

**For Value Object Schemas**:
- `{ObjectName}.avsc` (e.g., `Money.avsc`)
- Namespace: `com.{company}.{bounded-context}.values`

---

## Part 4: Sample Avro Schemas

### Example 1: Event Schema (Payment Processing)

**File**: `/contracts/payment-core/avro/PaymentCompletedEvent.avsc`

```json
{
  "type": "record",
  "namespace": "com.mybank.payments.events",
  "name": "PaymentCompletedEvent",
  "doc": "Published when a payment successfully completes",
  "fields": [
    {
      "name": "eventId",
      "type": "string",
      "doc": "Unique event identifier (UUID)"
    },
    {
      "name": "eventTimestamp",
      "type": "long",
      "logicalType": "timestamp-millis",
      "doc": "Event timestamp in milliseconds since epoch"
    },
    {
      "name": "paymentId",
      "type": "string",
      "doc": "Payment transaction ID"
    },
    {
      "name": "amount",
      "type": {
        "type": "record",
        "name": "Money",
        "fields": [
          {
            "name": "value",
            "type": {
              "type": "bytes",
              "logicalType": "decimal",
              "precision": 18,
              "scale": 2
            }
          },
          {
            "name": "currency",
            "type": {
              "type": "enum",
              "name": "CurrencyCode",
              "symbols": ["USD", "EUR", "GBP", "INR"]
            }
          }
        ]
      },
      "doc": "Payment amount and currency"
    },
    {
      "name": "sourceAccount",
      "type": "string",
      "doc": "Source account number"
    },
    {
      "name": "destinationAccount",
      "type": "string",
      "doc": "Destination account number"
    },
    {
      "name": "status",
      "type": {
        "type": "enum",
        "name": "PaymentStatus",
        "symbols": ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "REVERSED"]
      },
      "default": "COMPLETED"
    },
    {
      "name": "completedAt",
      "type": {
        "type": "long",
        "logicalType": "timestamp-millis"
      },
      "doc": "Completion timestamp"
    }
  ]
}
```

**Key Features**:
- Nested records (Money value object)
- Enums for status values
- Logical types for decimal amounts
- Timestamps in milliseconds
- Comprehensive documentation

---

### Example 2: Command Schema (Order Processing)

**File**: `/contracts/order-processing/avro/CreateOrderCommand.avsc`

```json
{
  "type": "record",
  "namespace": "com.mybank.orders.commands",
  "name": "CreateOrderCommand",
  "doc": "Command to create a new order in the system",
  "fields": [
    {
      "name": "commandId",
      "type": "string",
      "doc": "Command idempotency key (UUID)"
    },
    {
      "name": "customerId",
      "type": "string",
      "doc": "Customer identifier"
    },
    {
      "name": "items",
      "type": {
        "type": "array",
        "items": {
          "type": "record",
          "name": "OrderItem",
          "fields": [
            {
              "name": "productId",
              "type": "string"
            },
            {
              "name": "quantity",
              "type": "int"
            },
            {
              "name": "unitPrice",
              "type": {
                "type": "bytes",
                "logicalType": "decimal",
                "precision": 10,
                "scale": 2
              }
            }
          ]
        }
      },
      "doc": "List of items to order"
    },
    {
      "name": "shippingAddress",
      "type": [
        "null",
        {
          "type": "record",
          "name": "Address",
          "fields": [
            { "name": "street", "type": "string" },
            { "name": "city", "type": "string" },
            { "name": "zipCode", "type": "string" },
            { "name": "country", "type": "string" }
          ]
        }
      ],
      "default": null,
      "doc": "Optional shipping address"
    },
    {
      "name": "requestedAt",
      "type": {
        "type": "long",
        "logicalType": "timestamp-millis"
      },
      "doc": "Command request timestamp"
    }
  ]
}
```

**Key Features**:
- Arrays for multiple items
- Nested record types (OrderItem, Address)
- Optional fields (union with null)
- Defaults for optional fields
- Clear semantic field names

---

### Example 3: Value Object Schema

**File**: `/contracts/account-management/avro/Account.avsc`

```json
{
  "type": "record",
  "namespace": "com.mybank.accounts.values",
  "name": "Account",
  "doc": "Bank account value object representing core account data",
  "fields": [
    {
      "name": "accountId",
      "type": "string",
      "doc": "Unique account identifier"
    },
    {
      "name": "accountType",
      "type": {
        "type": "enum",
        "name": "AccountType",
        "symbols": ["CHECKING", "SAVINGS", "INVESTMENT", "CREDIT"]
      },
      "doc": "Type of account"
    },
    {
      "name": "balance",
      "type": {
        "type": "bytes",
        "logicalType": "decimal",
        "precision": 18,
        "scale": 2
      },
      "doc": "Current account balance"
    },
    {
      "name": "status",
      "type": {
        "type": "enum",
        "name": "AccountStatus",
        "symbols": ["ACTIVE", "INACTIVE", "SUSPENDED", "CLOSED"]
      },
      "doc": "Account operational status"
    },
    {
      "name": "createdAt",
      "type": {
        "type": "long",
        "logicalType": "timestamp-millis"
      },
      "doc": "Account creation timestamp"
    },
    {
      "name": "lastModifiedAt",
      "type": {
        "type": "long",
        "logicalType": "timestamp-millis"
      },
      "doc": "Last modification timestamp"
    },
    {
      "name": "metadata",
      "type": {
        "type": "map",
        "values": "string"
      },
      "default": {},
      "doc": "Additional account metadata (key-value pairs)"
    }
  ]
}
```

**Key Features**:
- Map type for flexible metadata
- Multiple enum types
- Decimal precision for financial data
- Timestamp tracking
- Clear documentation

---

## Part 5: Backstage UI Display Recommendations

### Current API Detail View

Your implementation creates API entities that will appear in Backstage catalog:

```
API: PaymentCommand (Avro)
├── Type: avro
├── Lifecycle: production
├── Owner: payments-squad
├── System: payment-core
└── Definition: [raw JSON schema]
```

### Recommended Enhancements

#### 1. Schema Visualization Component

**Recommendation**: Create a custom tab in the API entity detail view that displays:

```
AVRO SCHEMA VIEWER
├─ Namespace: com.banking.payments.events
├─ Type: record
├─ Fields: 8 total
│
└─ Field Breakdown:
   ├─ eventId (string): Unique event identifier
   ├─ eventTimestamp (long, timestamp-millis): Event timestamp
   ├─ paymentId (string): Payment transaction ID
   ├─ amount (record-Money): Payment amount and currency
   │  ├─ value (bytes-decimal): Amount value
   │  └─ currency (enum-CurrencyCode): Currency [USD, EUR, GBP, INR]
   ├─ sourceAccount (string): Source account number
   ├─ destinationAccount (string): Destination account number
   ├─ status (enum-PaymentStatus): Payment status [PENDING, PROCESSING, COMPLETED, FAILED, REVERSED]
   └─ completedAt (long, timestamp-millis): Completion timestamp
```

#### 2. Schema Validation Information

Add metadata extraction from parsed schema:

```typescript
export function extractAvroMetadata(parsedSchema: any) {
  return {
    namespace: parsedSchema.namespace,
    type: parsedSchema.type,
    name: parsedSchema.name,
    doc: parsedSchema.doc,
    fieldCount: parsedSchema.fields?.length || 0,
    nestedRecords: findNestedRecords(parsedSchema),
    enums: findEnums(parsedSchema),
    logicalTypes: findLogicalTypes(parsedSchema),
  };
}
```

#### 3. Cross-Reference Related Schemas

Since schemas can reference each other (nested records), add:

```
RELATED SCHEMAS
├─ Money (value-object): Used in 3 schemas
├─ PaymentStatus (enum): Used in 2 schemas
└─ Address (record): Used in CreateOrderCommand

DEPENDENT SCHEMAS
├─ PaymentCompletedEvent (depends on PaymentStatus, Money)
└─ PaymentFailedEvent (depends on PaymentStatus)
```

#### 4. Schema Evolution Tracking

Add version tracking:

```
VERSION HISTORY
├─ v1.0 (current): 8 fields - Added completedAt field
├─ v0.9: 7 fields - Initial version
└─ Breaking Changes: None
```

---

## Part 6: Implementation Recommendations

### 1. Extend Avro Metadata Extraction (in provider.ts)

```typescript
// Enhanced parsing to extract more metadata
for (const schema of avroSchemas) {
  const metadata = extractAvroMetadata(schema.parsedSchema);
  
  const avroApiEntity = apiJsonToApiEntity({
    id: `${schema.boundedContext}-${schema.schemaName}`,
    name: `${schema.schemaName} (Avro)`,
    description: metadata.doc || `Avro schema for ${schema.boundedContext}`,
    type: 'avro',
    systemId: schema.boundedContext,
    tags: ['avro', metadata.type, ...metadata.enums.map(e => `enum:${e}`)],
    definition: schema.rawSchema,
    // Custom metadata
    annotations: {
      'avro/namespace': metadata.namespace,
      'avro/fieldCount': String(metadata.fieldCount),
      'avro/logicalTypes': metadata.logicalTypes.join(','),
    },
  });
  entities.push(avroApiEntity);
}
```

### 2. Validation Rules

Add schema validation before ingestion:

```typescript
function validateAvroSchema(schema: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!schema.type) errors.push('Missing required field: type');
  if (!schema.name) errors.push('Missing required field: name');
  if (!schema.namespace) errors.push('Missing recommended field: namespace');
  if (!schema.doc) errors.push('Missing recommended field: doc');
  
  if (schema.fields) {
    schema.fields.forEach((field: any, idx: number) => {
      if (!field.name) errors.push(`Field ${idx}: missing name`);
      if (!field.type) errors.push(`Field ${field.name}: missing type`);
      if (!field.doc) errors.push(`Field ${field.name}: missing doc`);
    });
  }
  
  return { valid: errors.length === 0, errors };
}
```

### 3. Schema Search Enhancements

Enable searching by:
- Namespace: `namespace:com.banking.payments`
- Field names: `field:paymentId`
- Schema types: `type:record` or `type:enum`
- Logical types: `logicalType:decimal`

```typescript
const searchMetadata = {
  namespace: metadata.namespace,
  fields: schema.parsedSchema?.fields?.map(f => f.name) || [],
  enums: metadata.enums,
  logicalTypes: metadata.logicalTypes,
};
```

---

## Part 7: Testing Strategy

### Test Scenarios

1. **Valid Avro Schemas**
   - [ ] Fetch and parse schemas successfully
   - [ ] Extract metadata correctly
   - [ ] Create API entities with proper tags

2. **Schema Variations**
   - [ ] Record types (✓ primary use case)
   - [ ] Nested records ✓
   - [ ] Enums ✓
   - [ ] Arrays and maps ✓
   - [ ] Union types (null, optional) ✓
   - [ ] Logical types (decimal, timestamp) ✓

3. **Edge Cases**
   - [ ] Missing documentation
   - [ ] Circular references between schemas
   - [ ] Invalid JSON in `.avsc` files
   - [ ] Schemas with special characters in names
   - [ ] Empty avro directories
   - [ ] Very large schemas (>1MB)

4. **Integration**
   - [ ] Avro schemas link to correct bounded context
   - [ ] Owner squad properly assigned
   - [ ] Tags facilitate searching
   - [ ] Definitions stored correctly

---

## Part 8: Sample Test File

Create `/static-data/contracts/payment-core/avro/PaymentCompletedEvent.avsc`:

```json
{
  "type": "record",
  "namespace": "com.mybank.payments.events",
  "name": "PaymentCompletedEvent",
  "doc": "Event published when payment successfully completes. Contains full transaction details and final status.",
  "fields": [
    {
      "name": "eventId",
      "type": "string",
      "doc": "Unique event identifier (UUID v4)"
    },
    {
      "name": "eventTimestamp",
      "type": "long",
      "logicalType": "timestamp-millis",
      "doc": "When the payment was completed (milliseconds since epoch)"
    },
    {
      "name": "paymentId",
      "type": "string",
      "doc": "References the Payment aggregate root"
    },
    {
      "name": "amount",
      "type": {
        "type": "bytes",
        "logicalType": "decimal",
        "precision": 18,
        "scale": 2
      },
      "doc": "Payment amount in base currency units"
    },
    {
      "name": "sourceAccount",
      "type": "string",
      "doc": "Sending account number"
    },
    {
      "name": "destinationAccount",
      "type": "string",
      "doc": "Receiving account number"
    },
    {
      "name": "status",
      "type": {
        "type": "enum",
        "name": "PaymentStatus",
        "symbols": ["COMPLETED", "FAILED", "REVERSED"]
      },
      "default": "COMPLETED"
    }
  ]
}
```

---

## Summary

✅ **Current State**:
- Avro schemas are fetched from GitHub
- Ingested as API entities with type='avro'
- Metadata extracted (namespace, type)
- Tagged for searchability

✅ **What's Working**:
- Integration with existing OpenAPI pattern
- Proper bounded context linking
- Squad ownership assignment
- Raw schema storage in definition field

**Next Steps (Priority Order)**:

1. **High Priority**:
   - [ ] Fix GitHub token to test with real schemas
   - [ ] Deploy and verify schemas appear in Backstage
   - [ ] Create sample Avro schema files in contracts/

2. **Medium Priority**:
   - [ ] Create custom UI component for schema visualization
   - [ ] Add schema validation before ingestion
   - [ ] Implement schema search filters

3. **Future Enhancement**:
   - [ ] Schema versioning/history tracking
   - [ ] Schema dependency analysis
   - [ ] Field-level documentation in UI
   - [ ] Schema compatibility checking

---

## Appendix: Useful Resources

- **Apache Avro Spec**: https://avro.apache.org/docs/current/spec.html
- **Avro Type Mapping**: https://avro.apache.org/docs/current/spec.html#schema_primitive
- **Logical Types**: https://avro.apache.org/docs/current/spec.html#Logical+Types
- **Schema Best Practices**: https://docs.confluent.io/platform/current/schema-registry/fundamentals/index.html

---

## Action Items for You

1. **Update GitHub Token**: Generate a new valid token for `STATIC_DATA_GITHUB_TOKEN`
2. **Create Sample Schemas**: Add the provided examples to your contracts folder
3. **Test Ingestion**: Deploy and verify schemas load into Backstage
4. **Review UI**: Check how Avro APIs appear in the catalog
5. **Plan Enhancements**: Prioritize UI improvements from recommendations above

