# Architecture Model: Bounded Context Mapping

## Core Principles

### 1. Bounded Context = Backstage System
```
Bounded Context (DDD) ≡ System Entity (Backstage)
```

A **Bounded Context** is represented as a `System` entity in Backstage catalog.

### 2. Microservices = Backstage Components
```
Microservice ≡ Component Entity (Backstage)
```

Each **microservice** is represented as a `Component` entity.

### 3. Key Constraint: 1:1 Mapping
```
Each Component belongs to exactly ONE System (spec.system)
```

**This is a strict constraint:**
- ✅ A bounded context CAN have multiple microservices
- ✅ A microservice belongs to exactly ONE bounded context
- ❌ A microservice CANNOT be shared across multiple bounded contexts

## Catalog Structure

```yaml
# Domain (optional grouping)
kind: Domain
metadata:
  name: payments
spec:
  owner: platform-team

# Bounded Context (System)
kind: System
metadata:
  name: payment-core    # This is the Bounded Context ID
  title: Payment Core Context
spec:
  owner: payments-squad
  domain: payments

# Microservice 1 (Component)
kind: Component
metadata:
  name: payment-gateway
spec:
  type: service
  system: payment-core  # ← Links to Bounded Context
  owner: payments-squad
  providesApis:
    - payment-gateway-api
  consumesApis:
    - account-api

# Microservice 2 (Component)
kind: Component
metadata:
  name: payment-validator
spec:
  type: service
  system: payment-core  # ← Same Bounded Context
  owner: payments-squad
  providesApis:
    - payment-validation-api
```

## How Bounded Contexts are Discovered

### Algorithm

```typescript
// 1. Group components by spec.system
for each Component:
  boundedContext = component.spec.system  // THE KEY FIELD
  
  if boundedContext not exists:
    create new BoundedContext(id: boundedContext)
  
  add component to boundedContext.components[]
  aggregate component.providesApis → boundedContext.providedApis[]
  aggregate component.consumesApis → boundedContext.consumedApis[]

// 2. Result: Map of Bounded Contexts with their microservices
{
  "payment-core": {
    components: ["payment-gateway", "payment-validator"],
    providedApis: ["payment-gateway-api", "payment-validation-api"],
    consumedApis: ["account-api"]
  }
}
```

### Fallback Strategy

If a component doesn't have `spec.system`:

```typescript
const contextId = component.spec.system 
               || component.metadata.annotations['backstage.io/domain']
               || 'default-context';
```

**Priority:**
1. **Primary**: `spec.system` (explicit bounded context)
2. **Fallback**: `backstage.io/domain` annotation
3. **Default**: `'default-context'` (ungrouped microservices)

## Relationship Inference

Relationships are detected **between bounded contexts** based on their microservices' API dependencies:

```typescript
// Example: payment-core consumes account-api

payment-gateway (Component):
  spec.system: payment-core
  spec.consumesApis: [account-api]

account-service (Component):
  spec.system: account-management
  spec.providesApis: [account-api]

→ Relationship: account-management → payment-core (via account-api)
   Type: OPEN_HOST_SERVICE (OpenAPI)
```

### Cross-Context Detection

```typescript
for each BoundedContext:
  for each consumedApi in context.consumedApis:
    find providerContext where consumedApi in providerContext.providedApis
    
    if providerContext != currentContext:
      create Relationship(
        upstream: providerContext,
        downstream: currentContext,
        via: consumedApi
      )
```

## Example Architecture

### Banking System with 5 Bounded Contexts

```
┌─────────────────────────────────────────────────────────────┐
│ PAYMENT CORE (Bounded Context)                              │
│ ├── payment-gateway (microservice)                          │
│ ├── payment-validator (microservice)                        │
│ └── payment-reconciliation (microservice)                   │
└─────────────────────────────────────────────────────────────┘
                    ↓ consumes
┌─────────────────────────────────────────────────────────────┐
│ ACCOUNT MANAGEMENT (Bounded Context)                        │
│ ├── account-service (microservice)                          │
│ ├── balance-service (microservice)                          │
│ └── account-lifecycle (microservice)                        │
└─────────────────────────────────────────────────────────────┘
                    ↓ consumes
┌─────────────────────────────────────────────────────────────┐
│ CUSTOMER MANAGEMENT (Bounded Context)                       │
│ ├── customer-service (microservice)                         │
│ ├── kyc-service (microservice)                              │
│ └── customer-onboarding (microservice)                      │
└─────────────────────────────────────────────────────────────┘
```

Each box is a **Bounded Context (System)**.
Each line item is a **Microservice (Component)**.

## API Aggregation

When multiple microservices in the same bounded context provide/consume APIs, they are **aggregated at the context level**:

```typescript
// payment-core bounded context has 2 microservices:

payment-gateway:
  providesApis: [payment-gateway-api]
  consumesApis: [account-api, balance-api]

payment-validator:
  providesApis: [payment-validation-api]
  consumesApis: []

// Aggregated at bounded context level:
payment-core:
  providedApis: [payment-gateway-api, payment-validation-api]
  consumedApis: [account-api, balance-api]  // Deduplicated
```

## DDD Pattern Detection

Relationship types are determined by:

1. **Same Domain** → `SHARED_KERNEL`
   ```typescript
   if (upstream.domain === downstream.domain) {
     return 'SHARED_KERNEL';
   }
   ```

2. **gRPC/OpenAPI** → `OPEN_HOST_SERVICE`
   ```typescript
   if (api.type === 'openapi' || api.type === 'grpc') {
     return 'OPEN_HOST_SERVICE';
   }
   ```

3. **Default** → `CUSTOMER_SUPPLIER`
   ```typescript
   return 'CUSTOMER_SUPPLIER';
   ```

## What This Enables

### 1. Context Map Visualization
See all bounded contexts and their relationships:
```
GET /api/architecture/context-map
```

### 2. Context Analysis
Deep dive into a specific bounded context:
```
GET /api/architecture/contexts/payment-core
```

### 3. Dependency Analysis
Understand upstream/downstream dependencies:
```
GET /api/architecture/contexts/payment-core/dependencies
```

### 4. Impact Analysis
If we change `account-api`, which contexts are affected?
- Direct consumers: payment-core, loan-origination
- Transitive impact: All contexts that depend on payment-core

## Anti-Patterns Detected (Future)

### Shared Microservice (Violation!)
```yaml
# ❌ WRONG - Component in multiple systems
component: shared-utility
  system: payment-core  # Can only have ONE system
```

**Solution**: Create separate components or shared library.

### Unclear Boundaries
```yaml
# ⚠️ WARNING - No system specified
component: orphan-service
  # Missing: system: ???
```

**Detection**: Components without `spec.system` go to `default-context`.

## Configuration Examples

### Correct Multi-Microservice Bounded Context
```yaml
# System
kind: System
metadata:
  name: order-management
spec:
  owner: orders-squad

# Microservice 1
kind: Component
metadata:
  name: order-api
spec:
  system: order-management  # ← Key field

# Microservice 2
kind: Component
metadata:
  name: order-validator
spec:
  system: order-management  # ← Same system

# Microservice 3
kind: Component
metadata:
  name: order-fulfillment
spec:
  system: order-management  # ← Same system
```

Result: One bounded context with 3 microservices.

### Multiple Bounded Contexts
```yaml
# Context 1
kind: System
metadata:
  name: payment-core

kind: Component
metadata:
  name: payment-gateway
spec:
  system: payment-core

# Context 2
kind: System
metadata:
  name: fraud-detection

kind: Component
metadata:
  name: fraud-analyzer
spec:
  system: fraud-detection

# Context 3
kind: System
metadata:
  name: notification

kind: Component
metadata:
  name: notification-service
spec:
  system: notification
```

Result: Three bounded contexts, each with one microservice.

## Summary

| Concept | Backstage Entity | Key Field | Cardinality |
|---------|------------------|-----------|-------------|
| Bounded Context | System | `metadata.name` | 1..N Systems |
| Microservice | Component | `spec.system` | 1..N Components per System |
| API Contract | API | `spec.system` | 1..N APIs per System |
| Relationship | Derived | `providesApis` ↔ `consumesApis` | M:N between Contexts |

**The Golden Rule:**
```
spec.system IS the Bounded Context ID
Each Component has exactly ONE spec.system
Multiple Components can share the same spec.system
```

This model perfectly aligns with DDD principles where a bounded context can contain multiple microservices, but each microservice belongs to exactly one bounded context.
