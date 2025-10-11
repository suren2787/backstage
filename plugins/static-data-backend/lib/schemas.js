"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boundedContextSchema = exports.squadSchema = exports.applicationSchema = void 0;
exports.applicationSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        owner: { type: 'string' },
    },
    required: ['id', 'name'],
    additionalProperties: false,
};
exports.squadSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        members: { type: 'array', items: { type: 'string' } },
    },
    required: ['id', 'name'],
    additionalProperties: false,
};
exports.boundedContextSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        name: { type: 'string' },
    },
    required: ['id', 'name'],
    additionalProperties: false,
};
