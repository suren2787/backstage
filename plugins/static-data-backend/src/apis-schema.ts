export const apiSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    type: { type: 'string' },
    systemId: { type: 'string' },
    ownerSquadId: { type: 'string' },
    lifecycle: { type: 'string' },
    definition: { type: 'string' }, // OpenAPI/AsyncAPI/GraphQL schema as string or URL
    tags: { type: 'array', items: { type: 'string' } },
    visibility: { type: 'string' },
    version: { type: 'string' },
  },
  required: ['id', 'name', 'type', 'definition'],
  additionalProperties: true,
} as const;
