/**
 * Mock Data Generator for Context Mapping Testing
 * 
 * Simulates a realistic banking microservices architecture with:
 * - Multiple bounded contexts (payment, account, customer, loan, transaction)
 * - API relationships (REST APIs with providers/consumers)
 * - Components grouped by systems/domains
 * - Realistic GitHub URLs (simulated repositories)
 */

import { Entity } from '@backstage/catalog-model';

/**
 * Generate mock catalog entities for testing context mapping
 */
export function generateMockCatalogEntities(): Entity[] {
  const entities: Entity[] = [];

  // ============================================
  // DOMAINS
  // ============================================
  
  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Domain',
    metadata: {
      name: 'payments',
      title: 'Payments Domain',
      description: 'Payment processing and transaction management'
    },
    spec: {
      owner: 'platform-team'
    }
  });

  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Domain',
    metadata: {
      name: 'banking-core',
      title: 'Banking Core Domain',
      description: 'Core banking operations - accounts, customers, transactions'
    },
    spec: {
      owner: 'platform-team'
    }
  });

  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Domain',
    metadata: {
      name: 'lending',
      title: 'Lending Domain',
      description: 'Loan origination and management'
    },
    spec: {
      owner: 'platform-team'
    }
  });

  // ============================================
  // SYSTEMS (Bounded Contexts)
  // ============================================

  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'System',
    metadata: {
      name: 'payment-core',
      title: 'Payment Core Context',
      description: 'Payment processing bounded context'
    },
    spec: {
      owner: 'payments-squad',
      domain: 'payments'
    }
  });

  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'System',
    metadata: {
      name: 'account-management',
      title: 'Account Management Context',
      description: 'Account operations and balance management'
    },
    spec: {
      owner: 'accounts-squad',
      domain: 'banking-core'
    }
  });

  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'System',
    metadata: {
      name: 'customer-management',
      title: 'Customer Management Context',
      description: 'Customer profile and KYC management'
    },
    spec: {
      owner: 'customer-squad',
      domain: 'banking-core'
    }
  });

  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'System',
    metadata: {
      name: 'loan-origination',
      title: 'Loan Origination Context',
      description: 'Loan application and approval process'
    },
    spec: {
      owner: 'lending-squad',
      domain: 'lending'
    }
  });

  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'System',
    metadata: {
      name: 'transaction-processing',
      title: 'Transaction Processing Context',
      description: 'Transaction history and reconciliation'
    },
    spec: {
      owner: 'operations-squad',
      domain: 'banking-core'
    }
  });

  // ============================================
  // APIs
  // ============================================

  // Payment APIs
  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'API',
    metadata: {
      name: 'payment-gateway-api',
      title: 'Payment Gateway API',
      description: 'Process payment transactions'
    },
    spec: {
      type: 'openapi',
      lifecycle: 'production',
      owner: 'payments-squad',
      system: 'payment-core',
      definition: 'openapi: 3.0.0'
    }
  });

  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'API',
    metadata: {
      name: 'payment-validation-api',
      title: 'Payment Validation API',
      description: 'Validate payment requests'
    },
    spec: {
      type: 'openapi',
      lifecycle: 'production',
      owner: 'payments-squad',
      system: 'payment-core',
      definition: 'openapi: 3.0.0'
    }
  });

  // Account APIs
  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'API',
    metadata: {
      name: 'account-api',
      title: 'Account API',
      description: 'Account CRUD operations'
    },
    spec: {
      type: 'openapi',
      lifecycle: 'production',
      owner: 'accounts-squad',
      system: 'account-management',
      definition: 'openapi: 3.0.0'
    }
  });

  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'API',
    metadata: {
      name: 'balance-inquiry-api',
      title: 'Balance Inquiry API',
      description: 'Check account balances'
    },
    spec: {
      type: 'openapi',
      lifecycle: 'production',
      owner: 'accounts-squad',
      system: 'account-management',
      definition: 'openapi: 3.0.0'
    }
  });

  // Customer APIs
  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'API',
    metadata: {
      name: 'customer-api',
      title: 'Customer API',
      description: 'Customer profile management'
    },
    spec: {
      type: 'openapi',
      lifecycle: 'production',
      owner: 'customer-squad',
      system: 'customer-management',
      definition: 'openapi: 3.0.0'
    }
  });

  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'API',
    metadata: {
      name: 'kyc-verification-api',
      title: 'KYC Verification API',
      description: 'Customer verification and KYC'
    },
    spec: {
      type: 'grpc',
      lifecycle: 'production',
      owner: 'customer-squad',
      system: 'customer-management',
      definition: 'grpc protobuf'
    }
  });

  // Loan APIs
  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'API',
    metadata: {
      name: 'loan-application-api',
      title: 'Loan Application API',
      description: 'Submit and manage loan applications'
    },
    spec: {
      type: 'openapi',
      lifecycle: 'production',
      owner: 'lending-squad',
      system: 'loan-origination',
      definition: 'openapi: 3.0.0'
    }
  });

  // Transaction API
  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'API',
    metadata: {
      name: 'transaction-history-api',
      title: 'Transaction History API',
      description: 'Query transaction history'
    },
    spec: {
      type: 'openapi',
      lifecycle: 'production',
      owner: 'operations-squad',
      system: 'transaction-processing',
      definition: 'openapi: 3.0.0'
    }
  });

  // ============================================
  // COMPONENTS - Payment Core
  // ============================================

  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'payment-gateway',
      title: 'Payment Gateway Service',
      description: 'Core payment processing service',
      annotations: {
        'github.com/project-slug': 'mybank/payment-gateway',
        'backstage.io/source-location': 'url:https://github.com/mybank/payment-gateway'
      }
    },
    spec: {
      type: 'service',
      lifecycle: 'production',
      owner: 'payments-squad',
      system: 'payment-core',
      providesApis: ['payment-gateway-api'],
      consumesApis: ['account-api', 'balance-inquiry-api', 'transaction-history-api']
    }
  });

  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'payment-validator',
      title: 'Payment Validator Service',
      description: 'Validates payment requests',
      annotations: {
        'github.com/project-slug': 'mybank/payment-validator',
        'backstage.io/source-location': 'url:https://github.com/mybank/payment-validator'
      }
    },
    spec: {
      type: 'service',
      lifecycle: 'production',
      owner: 'payments-squad',
      system: 'payment-core',
      providesApis: ['payment-validation-api'],
      consumesApis: []
    }
  });

  // ============================================
  // COMPONENTS - Account Management
  // ============================================

  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'account-service',
      title: 'Account Service',
      description: 'Account management service',
      annotations: {
        'github.com/project-slug': 'mybank/account-service',
        'backstage.io/source-location': 'url:https://github.com/mybank/account-service'
      }
    },
    spec: {
      type: 'service',
      lifecycle: 'production',
      owner: 'accounts-squad',
      system: 'account-management',
      providesApis: ['account-api', 'balance-inquiry-api'],
      consumesApis: ['customer-api', 'transaction-history-api']
    }
  });

  // ============================================
  // COMPONENTS - Customer Management
  // ============================================

  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'customer-service',
      title: 'Customer Service',
      description: 'Customer profile service',
      annotations: {
        'github.com/project-slug': 'mybank/customer-service',
        'backstage.io/source-location': 'url:https://github.com/mybank/customer-service'
      }
    },
    spec: {
      type: 'service',
      lifecycle: 'production',
      owner: 'customer-squad',
      system: 'customer-management',
      providesApis: ['customer-api'],
      consumesApis: []
    }
  });

  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'kyc-service',
      title: 'KYC Service',
      description: 'KYC verification service',
      annotations: {
        'github.com/project-slug': 'mybank/kyc-service',
        'backstage.io/source-location': 'url:https://github.com/mybank/kyc-service'
      }
    },
    spec: {
      type: 'service',
      lifecycle: 'production',
      owner: 'customer-squad',
      system: 'customer-management',
      providesApis: ['kyc-verification-api'],
      consumesApis: ['customer-api']
    }
  });

  // ============================================
  // COMPONENTS - Loan Origination
  // ============================================

  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'loan-application-service',
      title: 'Loan Application Service',
      description: 'Loan application processing',
      annotations: {
        'github.com/project-slug': 'mybank/loan-application-service',
        'backstage.io/source-location': 'url:https://github.com/mybank/loan-application-service'
      }
    },
    spec: {
      type: 'service',
      lifecycle: 'production',
      owner: 'lending-squad',
      system: 'loan-origination',
      providesApis: ['loan-application-api'],
      consumesApis: ['customer-api', 'kyc-verification-api', 'account-api']
    }
  });

  // ============================================
  // COMPONENTS - Transaction Processing
  // ============================================

  entities.push({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'transaction-service',
      title: 'Transaction Service',
      description: 'Transaction recording and history',
      annotations: {
        'github.com/project-slug': 'mybank/transaction-service',
        'backstage.io/source-location': 'url:https://github.com/mybank/transaction-service'
      }
    },
    spec: {
      type: 'service',
      lifecycle: 'production',
      owner: 'operations-squad',
      system: 'transaction-processing',
      providesApis: ['transaction-history-api'],
      consumesApis: []
    }
  });

  return entities;
}

/**
 * Get summary of mock data structure
 */
export function getMockDataSummary() {
  const entities = generateMockCatalogEntities();
  
  const domains = entities.filter(e => e.kind === 'Domain');
  const systems = entities.filter(e => e.kind === 'System');
  const apis = entities.filter(e => e.kind === 'API');
  const components = entities.filter(e => e.kind === 'Component');

  return {
    total: entities.length,
    domains: domains.length,
    systems: systems.length,
    apis: apis.length,
    components: components.length,
    boundedContexts: systems.map(s => ({
      id: s.metadata.name,
      domain: s.spec?.domain,
      componentCount: components.filter(c => c.spec?.system === s.metadata.name).length,
      apiCount: apis.filter(a => a.spec?.system === s.metadata.name).length
    }))
  };
}

/**
 * Expected context map structure from this mock data
 */
export function getExpectedContextMap() {
  return {
    contexts: [
      {
        id: 'payment-core',
        components: ['payment-gateway', 'payment-validator'],
        providedApis: ['payment-gateway-api', 'payment-validation-api'],
        consumedApis: ['account-api', 'balance-inquiry-api', 'transaction-history-api']
      },
      {
        id: 'account-management',
        components: ['account-service'],
        providedApis: ['account-api', 'balance-inquiry-api'],
        consumedApis: ['customer-api', 'transaction-history-api']
      },
      {
        id: 'customer-management',
        components: ['customer-service', 'kyc-service'],
        providedApis: ['customer-api', 'kyc-verification-api'],
        consumedApis: ['customer-api']
      },
      {
        id: 'loan-origination',
        components: ['loan-application-service'],
        providedApis: ['loan-application-api'],
        consumedApis: ['customer-api', 'kyc-verification-api', 'account-api']
      },
      {
        id: 'transaction-processing',
        components: ['transaction-service'],
        providedApis: ['transaction-history-api'],
        consumedApis: []
      }
    ],
    relationships: [
      { upstream: 'account-management', downstream: 'payment-core', via: 'account-api' },
      { upstream: 'account-management', downstream: 'payment-core', via: 'balance-inquiry-api' },
      { upstream: 'transaction-processing', downstream: 'payment-core', via: 'transaction-history-api' },
      { upstream: 'customer-management', downstream: 'account-management', via: 'customer-api' },
      { upstream: 'transaction-processing', downstream: 'account-management', via: 'transaction-history-api' },
      { upstream: 'customer-management', downstream: 'loan-origination', via: 'customer-api' },
      { upstream: 'customer-management', downstream: 'loan-origination', via: 'kyc-verification-api' },
      { upstream: 'account-management', downstream: 'loan-origination', via: 'account-api' },
      { upstream: 'customer-management', downstream: 'customer-management', via: 'customer-api' } // SHARED_KERNEL
    ]
  };
}
