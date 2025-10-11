"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationToComponent = applicationToComponent;
exports.squadToGroup = squadToGroup;
exports.boundedContextToDomain = boundedContextToDomain;
function applicationToComponent(app) {
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
    };
}
function squadToGroup(squad) {
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
    };
}
function boundedContextToDomain(bc) {
    return {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Domain',
        metadata: {
            name: bc.id,
            title: bc.name,
        },
    };
}
