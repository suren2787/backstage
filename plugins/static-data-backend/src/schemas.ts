export const applicationSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    status: { type: 'string' },
    applicationType: { type: 'string' },
    inContextOfBoundedContextId: { type: 'string' },
    url: { type: 'string' },
    supportedbySquadsIds: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'name'],
  additionalProperties: true,
} as const;

export const squadSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    githubTeam: { type: 'string' },
    members: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'name'],
  additionalProperties: true,
} as const;

export const boundedContextSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    ownerSquadId: { type: 'string' },
  },
  required: ['id', 'name'],
  additionalProperties: true,
} as const;
