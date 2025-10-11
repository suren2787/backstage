export const applicationSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    owner: { type: 'string' },
  },
  required: ['id', 'name'],
  additionalProperties: false,
} as const;

export const squadSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    members: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'name'],
  additionalProperties: false,
} as const;

export const boundedContextSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
  },
  required: ['id', 'name'],
  additionalProperties: false,
} as const;
