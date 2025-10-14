const API_BASE = '/api/architecture';

async function loadData() {
    const content = document.getElementById('content');
    content.innerHTML = '<div class="loading">Loading context map...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/context-map`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        renderContextMap(data);
    } catch (error) {
        content.innerHTML = `
            <div class="error">
                <strong>Error loading data:</strong> ${error.message}<br>
                <small>Make sure your backend is running on http://localhost:7007</small>
            </div>
        `;
    }
}

function renderContextMap(data) {
    const { contexts, relationships, metadata } = data;
    
    const html = `
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${metadata.totalContexts}</div>
                <div class="stat-label">Bounded Contexts</div>
            </div>
            <div class="stat-card secondary">
                <div class="stat-number">${metadata.totalRelationships}</div>
                <div class="stat-label">Relationships</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${contexts.reduce((sum, c) => sum + c.components.length, 0)}</div>
                <div class="stat-label">Components</div>
            </div>
            <div class="stat-card secondary">
                <div class="stat-number">${contexts.reduce((sum, c) => sum + c.providedApis.length, 0)}</div>
                <div class="stat-label">APIs</div>
            </div>
        </div>
        
        <div class="section">
            <h2 class="section-title">📦 Bounded Contexts</h2>
            <div class="context-grid">
                ${contexts.map(ctx => renderContextCard(ctx)).join('')}
            </div>
        </div>
        
        <div class="section">
            <h2 class="section-title">🔗 Context Relationships</h2>
            <table class="relationships-table">
                <thead>
                    <tr>
                        <th>Upstream Context</th>
                        <th></th>
                        <th>Downstream Context</th>
                        <th>Pattern</th>
                        <th>Via APIs</th>
                    </tr>
                </thead>
                <tbody>
                    ${relationships.map(rel => renderRelationship(rel)).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="subtitle" style="margin-top: 40px; text-align: center;">
            Generated at ${new Date(metadata.generatedAt).toLocaleString()}
        </div>
    `;
    
    document.getElementById('content').innerHTML = html;
}

function renderContextCard(context) {
    return `
        <div class="context-card">
            <div class="context-header">
                <div>
                    <div class="context-name">${context.name}</div>
                    <div class="context-id">${context.id}</div>
                </div>
            </div>
            
            ${context.team ? `<div class="context-team"><strong>Team:</strong> ${context.team}</div>` : ''}
            
            <div class="context-components">
                <strong style="font-size: 13px;">Components (${context.components.length}):</strong>
                <ul class="component-list">
                    ${context.components.map(comp => `
                        <li class="component-item">
                            <span class="component-type">${comp.type}</span>
                            ${comp.name}
                            ${comp.githubUrl && comp.githubUrl !== 'https' ? 
                                `<a href="${comp.githubUrl}" target="_blank" class="github-link">🔗</a>` : ''}
                        </li>
                    `).join('')}
                </ul>
            </div>
            
            <div class="api-count">
                <strong>Provides:</strong> ${context.providedApis.length} APIs | 
                <strong>Consumes:</strong> ${context.consumedApis.length} APIs
            </div>
        </div>
    `;
}

function renderRelationship(rel) {
    const typeClass = rel.relationshipType.toLowerCase().replace(/_/g, '-');
    return `
        <tr>
            <td>
                <span class="context-link">${rel.upstreamContext}</span>
            </td>
            <td class="arrow">→</td>
            <td>
                <span class="context-link">${rel.downstreamContext}</span>
            </td>
            <td>
                <span class="relationship-type ${typeClass}">${rel.relationshipType}</span>
            </td>
            <td style="font-size: 12px; color: #666;">
                ${rel.viaApis.map(api => api.split('/').pop()).join(', ')}
            </td>
        </tr>
    `;
}

// Add event listener for refresh button
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('refreshBtn').addEventListener('click', loadData);
    // Load data on page load
    loadData();
});
