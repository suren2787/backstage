// Map apis.json structure to Backstage API entity
// id -> metadata.name
// name -> metadata.title
// description -> metadata.description
// type -> spec.type
// systemId -> spec.system
// ownerSquadId -> spec.owner
// lifecycle -> spec.lifecycle
// definition -> spec.definition
// tags -> metadata.tags
// visibility -> spec.visibility
// version -> spec.version
export function apiJsonToApiEntity(api: any): Entity {
  const annotations: Record<string, string> = {
    'backstage.io/managed-by-location': 'static-data:import',
    'backstage.io/managed-by-origin-location': 'static-data:import',
  };
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'API',
    metadata: {
      name: api.id,
      title: api.name,
      description: api.description,
      tags: api.tags || [],
      annotations,
    },
    spec: {
      type: api.type,
      lifecycle: api.lifecycle || 'production',
      owner: api.ownerSquadId || 'unknown',
      system: api.systemId || undefined,
      definition: api.definition,
      visibility: api.visibility || 'public',
      version: api.version || undefined,
    },
  } as Entity;
}
// Map applications.json structure to Backstage Component entity
// Mapping:
// id -> metadata.name
// name -> metadata.title
// description -> metadata.description
// url -> metadata.annotations["backstage.io/source-location"] (with 'url:' prefix)
// status -> spec.lifecycle
// supportedBySquadsIds[0] -> spec.owner
// inContextOfBoundedContextId -> spec.system
// applicationType -> spec.tags

export function applicationJsonToComponentEntity(app: any): Entity {
  const annotations: Record<string, string> = {
    'backstage.io/managed-by-location': 'static-data:import',
    'backstage.io/managed-by-origin-location': 'static-data:import',
  };
  if (app.url) {
    // Add source-location annotation, ensure no duplicate 'url:'
    const url = app.url.startsWith('url:') ? app.url : `url:${app.url}`;
    annotations['backstage.io/source-location'] = url;
  }
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: app.id,
      title: app.name,
      description: app.description,
      annotations,
    },
    spec: {
      type: app.applicationType || 'service',
      lifecycle: app.status || 'production',
      owner: Array.isArray(app.supportedBySquadsIds) && app.supportedBySquadsIds.length > 0 ? app.supportedBySquadsIds[0] : 'unknown',
      system: app.inContextOfBoundedContextId || undefined,
      tags: app.applicationType ? [app.applicationType] : [],
    },
  } as Entity;
}
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
  // Map applications.json structure to Backstage Component entity
  // id -> metadata.name
  // name -> metadata.title
  // description -> metadata.description
  // url -> metadata.annotations["backstage.io/source-location"] (with 'url:' prefix)
  // status -> spec.lifecycle
  // supportedBySquadsIds[0] -> spec.owner
  // inContextOfBoundedContextId -> spec.system
  // applicationType -> spec.tags
  const annotations: Record<string, string> = {
    'backstage.io/managed-by-location': 'static-data:import',
    'backstage.io/managed-by-origin-location': 'static-data:import',
  };
  if (app.url) {
    const url = app.url.startsWith('url:') ? app.url : `url:${app.url}`;
    annotations['backstage.io/source-location'] = url;
  }
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: app.id,
      title: app.name,
      description: app.description,
      annotations,
    },
    spec: {
      type: app.applicationType || 'service',
      lifecycle: app.status || 'production',
      owner: Array.isArray(app.supportedBySquadsIds) && app.supportedBySquadsIds.length > 0 ? app.supportedBySquadsIds[0] : 'unknown',
      system: app.inContextOfBoundedContextId || undefined,
      tags: app.applicationType ? [app.applicationType] : [],
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
    const owner = bc.ownerSquadId ?? 'unknown';
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
    // Use ownerSquadId field from bounded-contexts.json
    const owner = bc.ownerSquadId ?? 'unknown';
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
