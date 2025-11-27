# Avro Schema Quick Reference

## File Locations

```
📂 /static-data/contracts/{bounded-context}/avro/{SchemaName}.avsc
   ├── payment-core/avro/
   │   ├── PaymentCompletedEvent.avsc
   │   └── CreatePaymentCommand.avsc
   ├── account-management/avro/
   │   └── AccountOpenedEvent.avsc
   └── order-processing/avro/
       ├── CreateOrderCommand.avsc
       └── OrderCreatedEvent.avsc
```

## How to Add a New Avro Schema

### Step 1: Create the file
```bash
touch static-data/contracts/{bounded-context}/avro/{SchemaName}.avsc
```

### Step 2: Use this template
```json
{
  "type": "record",
  "namespace": "com.mybank.{bounded-context}.{type}",
  "name": "{SchemaName}",
  "doc": "Brief description of what this schema represents",
  "fields": [
    {
      "name": "fieldName",
      "type": "string",
      "doc": "What this field represents"
    }
  ]
}
```

### Step 3: Validate
```bash
node test-avro-schemas.js
```

### Step 4: Deploy
```bash
cd backstage
yarn dev
# Schemas will be auto-ingested into catalog
```

---

## Common Avro Types

| Type | Example | Use Case |
|------|---------|----------|
| `string` | `"John"` | Text |
| `int` | `42` | Numbers (-2³¹ to 2³¹-1) |
| `long` | `9223372036854775807` | Large numbers |
| `bytes` | Binary data | Encryption, decimals |
| `boolean` | `true` | Flags |
| `null` | `null` | Missing value |

### Logical Types (Add precision)
```json
{
  "type": "long",
  "logicalType": "timestamp-millis"
}
```

### Complex Types

**Enum** (Fixed values)
```json
{
  "type": "enum",
  "name": "Status",
  "symbols": ["ACTIVE", "INACTIVE", "PENDING"]
}
```

**Record** (Nested object)
```json
{
  "type": "record",
  "name": "Address",
  "fields": [
    { "name": "street", "type": "string" },
    { "name": "city", "type": "string" }
  ]
}
```

**Array** (List)
```json
{
  "type": "array",
  "items": "string"
}
```

**Map** (Key-value pairs)
```json
{
  "type": "map",
  "values": "string"
}
```

**Union** (Multiple types / optional)
```json
{
  "type": ["null", "string"],
  "default": null
}
```

---

## Schema Metadata Extraction

The ingestion process automatically extracts:

```typescript
{
  namespace: "com.mybank.payments.events",
  type: "record",
  name: "PaymentCompletedEvent",
  fieldCount: 7,
  enums: ["PaymentStatus"],
  nestedRecords: [],
  logicalTypes: ["decimal", "timestamp-millis"]
}
```

This becomes:

- **name**: Schema name
- **system**: Bounded context name
- **owner**: Squad from bounded-contexts.json
- **tags**: `[avro, {type}, {schema-type}]`
- **definition**: Raw JSON schema

---

## Naming Conventions

### For Events
- Use **past tense**: `PaymentCompletedEvent`, not `PaymentCompletingEvent`
- Namespace: `com.{company}.{bounded-context}.events`
- Example: `com.mybank.payments.events.PaymentCompletedEvent`

### For Commands
- Use **imperative**: `CreatePaymentCommand`, not `CreatePaymentEvent`
- Namespace: `com.{company}.{bounded-context}.commands`
- Example: `com.mybank.payments.commands.CreatePaymentCommand`

### For Value Objects
- Use **noun**: `Money`, `Address`, not `MoneyValue`
- Namespace: `com.{company}.{bounded-context}.values`
- Example: `com.mybank.payments.values.Money`

---

## Best Practices

### ✅ DO

1. **Always document fields**
   ```json
   {
     "name": "paymentId",
     "type": "string",
     "doc": "References the Payment aggregate root"  // ← Always add
   }
   ```

2. **Use namespaces**
   ```json
   "namespace": "com.mybank.payments.events"  // ← Organize schemas
   ```

3. **Default values for optional fields**
   ```json
   {
     "name": "description",
     "type": ["null", "string"],
     "default": null  // ← Specify default
   }
   ```

4. **Use logical types for precision**
   ```json
   {
     "type": "bytes",
     "logicalType": "decimal",
     "precision": 18,
     "scale": 2  // ← For financial data
   }
   ```

5. **Semantic field names**
   ```json
   "name": "paymentCompletedAt"  // ← Clear intent
   ```

### ❌ DON'T

1. **Don't skip documentation**
   ```json
   { "name": "x", "type": "string" }  // ← Bad, unclear
   ```

2. **Don't use vague types**
   ```json
   { "type": "string" }  // ← Could be number, uuid, etc.
   ```

3. **Don't use optional without default**
   ```json
   { "type": ["null", "string"] }  // ← No default!
   ```

4. **Don't use floating point for money**
   ```json
   { "type": "double" }  // ← Precision loss!
   ```

---

## Testing Schemas

### Run validation script
```bash
node test-avro-schemas.js
```

### Manual validation
```bash
# Parse schema
cat static-data/contracts/payment-core/avro/PaymentCompletedEvent.avsc | python -m json.tool

# Check for common issues
grep -E '"type":|"name":|"doc":' static-data/contracts/payment-core/avro/*.avsc
```

### Expected output
```
✅ PaymentCompletedEvent.avsc
   Name: PaymentCompletedEvent
   Namespace: com.mybank.payments.events
   Fields: 7
   Enums: PaymentStatus
   Logical Types: decimal
```

---

## Integration Flow

```
1. SchemaFile.avsc
   ↓
2. fetchAllAvroSchemasFromContracts()
   ├─ List bounded contexts
   ├─ For each: list avro/ directory
   ├─ For each .avsc: fetch & parse
   ↓
3. Extract metadata
   ├─ Parse JSON
   ├─ Find enums
   ├─ Find nested records
   ├─ Find logical types
   ↓
4. Create API Entity
   ├─ kind: API
   ├─ type: avro
   ├─ system: {bounded-context}
   ├─ tags: [avro, record, ...]
   ├─ definition: {raw JSON}
   ↓
5. Backstage Catalog
   ├─ Searchable
   ├─ Viewable
   ├─ Linkable to Systems & APIs
```

---

## Schema Examples

### ✅ Good Example
```json
{
  "type": "record",
  "namespace": "com.mybank.payments.events",
  "name": "PaymentCompletedEvent",
  "doc": "Emitted when payment successfully completes",
  "fields": [
    {
      "name": "eventId",
      "type": "string",
      "doc": "UUID v4 event identifier"
    },
    {
      "name": "paymentId",
      "type": "string",
      "doc": "Links to Payment aggregate"
    },
    {
      "name": "amount",
      "type": {
        "type": "bytes",
        "logicalType": "decimal",
        "precision": 18,
        "scale": 2
      },
      "doc": "Amount in base currency"
    },
    {
      "name": "status",
      "type": {
        "type": "enum",
        "name": "PaymentStatus",
        "symbols": ["COMPLETED", "FAILED"]
      },
      "doc": "Payment outcome"
    }
  ]
}
```

### ❌ Poor Example
```json
{
  "type": "record",
  "name": "Event",
  "fields": [
    { "name": "id", "type": "string" },
    { "name": "data", "type": "string" },
    { "name": "amount", "type": "double" }
  ]
}
```

Problems:
- No namespace
- No documentation
- Vague field names ("id", "data")
- Floating point for money
- No enums for status values

---

## Troubleshooting

### Schema not appearing in Backstage
1. Check schema syntax: `node test-avro-schemas.js`
2. Verify file location: `/contracts/{bc}/avro/{name}.avsc`
3. Ensure valid JSON: `cat file.avsc | python -m json.tool`
4. Check GitHub token in `.env`
5. Restart Backstage: `yarn dev`

### Invalid schema error
- Ensure all fields have `type` specified
- Check JSON syntax (valid braces, commas)
- Verify enum `symbols` array is valid
- Use `json.tool` to validate: `python -m json.tool < schema.avsc`

### Schema metadata not extracted
- Ensure `namespace` field is present
- Ensure `name` field is present
- Check `fields` array structure
- Verify nested records have `name` and `fields`

---

## References

- **Avro Spec**: https://avro.apache.org/docs/current/spec.html
- **Logical Types**: https://avro.apache.org/docs/current/spec.html#Logical+Types
- **This Project**: `AVRO_SCHEMA_ANALYSIS.md`

---

**Last Updated**: 2025-01-15  
**Ready**: ✅ Yes - 5 sample schemas validated and working

