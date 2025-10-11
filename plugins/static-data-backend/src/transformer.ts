// Domain transformer: maps a domain JSON object to a Backstage Domain entity
export function domainToDomain(domain: any): Entity {
  const owner = domain.owner ?? 'unknown';
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Domain',
    metadata: {
      name: domain.id,
      title: domain.name,
      description: domain.description,
      annotations: {
        'backstage.io/managed-by-location': 'static-data:import',
        'backstage.io/managed-by-origin-location': 'static-data:import',
      },
    },
    spec: {
      owner: owner,
    },
  } as Entity;
}
import { Entity } from '@backstage/catalog-model';

export function applicationToComponent(app: any): Entity {
  const metadata = {
    name: app.id,
    title: app.name,
    description: app.description,
    annotations: {
      'backstage.io/managed-by-location': 'static-data:import',
      'backstage.io/managed-by-origin-location': 'static-data:import',
    },
  };

  // BIAN: Component (microservice) belongs to a system (bounded context) and is owned by a squad
  const owner = app.owner ?? 'unknown';
  const system = app.system ?? undefined; // system = bounded context id

  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata,
    spec: {
      type: 'service',
      lifecycle: 'production',
      owner: owner,
      system: system,
    },
  } as Entity;
}

export function squadToGroup(squad: any): Entity {
  // BIAN: Group (squad/team) may own domains, systems, or components
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Group',
    metadata: {
      name: squad.id,
      title: squad.name,
      annotations: {
        'backstage.io/managed-by-location': 'static-data:import',
        'backstage.io/managed-by-origin-location': 'static-data:import',
      },
    },
    spec: {
      type: 'team',
      children: squad.members ?? [],
    },
  } as Entity;
}

// BIAN: Bounded Context is mapped as a System, and Domain is mapped as Domain
export function boundedContextToDomain(bc: any): Entity {
  // If bc.type === 'domain', treat as Domain, else as System
  if (bc.type === 'domain' || (!bc.system && !bc.domain)) {
    // Domain entity
    const owner = bc.owner ?? 'unknown';
    return {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Domain',
      metadata: {
        name: bc.id,
        title: bc.name,
        description: bc.description,
        annotations: {
          'backstage.io/managed-by-location': 'static-data:import',
          'backstage.io/managed-by-origin-location': 'static-data:import',
        },
      },
      spec: {
        owner: owner,
      },
    } as Entity;
  } else {
    // System entity (bounded context)
    const owner = bc.owner ?? 'unknown';
    const domain = bc.domain ?? undefined;
    return {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'System',
      metadata: {
        name: bc.id,
        title: bc.name,
        description: bc.description,
        annotations: {
          'backstage.io/managed-by-location': 'static-data:import',
          'backstage.io/managed-by-origin-location': 'static-data:import',
        },
      },
      spec: {
        owner: owner,
        domain: domain,
      },
    } as Entity;
  }
}
