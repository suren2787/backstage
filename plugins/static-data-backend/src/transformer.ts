import { Entity } from '@backstage/catalog-model';

export function applicationToComponent(app: any): Entity {
  const metadata = {
    name: app.id,
    title: app.name,
    description: app.description,
  };

  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata,
    spec: {
      type: 'service',
      owner: app.owner ?? 'unknown',
    },
  } as Entity;
}

export function squadToGroup(squad: any): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Group',
    metadata: {
      name: squad.id,
      title: squad.name,
    },
    spec: {
      type: 'team',
      children: squad.members ?? [],
    },
  } as Entity;
}

export function boundedContextToDomain(bc: any): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Domain',
    metadata: {
      name: bc.id,
      title: bc.name,
    },
  } as Entity;
}
