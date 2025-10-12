# Kafka Topology Plugin - Development TODO

Track incremental progress for building the plugin.


## Phase 1: Local YAML Development ✅ COMPLETE
- [x] Scaffold plugin structure (folders, initial files, README)
- [x] Design plugin API (YAML schema, input config)
  - Topic YAML schema:
    ```yaml
    - name: string
      partitions: number
      logCompaction: boolean
      producers: [string]
      consumers: [string]
    ```
  - Input config:
    - Path to YAML files/folder
- [x] Parse YAML topic definitions — complete
- [x] Testing (unit tests for parsing/graph) — parser test implemented and passing
- [x] Build relationship graph data — complete
- [x] Render diagram UI (react-flow-renderer) — complete
- [x] Multi-context support — complete (supports multiple bounded contexts)
- [x] Context filtering/selection — complete (dropdown selector)
- [x] Custom layout (Producer→Topic→Consumer) — complete (dagre-based three-column layout)
- [x] Visual improvements — complete (custom edges, partition display)
- [x] Topic details panel — complete (click to view topic metadata)

## Phase 2: GitHub Integration ✅ COMPLETE
- [x] Fetch YAML files from GitHub — complete (GitHubLoader implementation)
- [x] Support GitHub repo URL and token in input config — complete
- [x] Backstage app-config.yaml integration — complete (standalone config)
- [x] Custom node types for topic visualization — complete (TopicNode with partition display)
- [x] Edge rendering fixes — complete (proper React Flow handles)

## Phase 3: Backstage Integration ✅ COMPLETE
- [x] Remove manual GitHub config UI — complete
- [x] Backstage entity annotation support — complete (app-config.yaml approach)
- [x] Standalone plugin configuration — complete
- [x] Production-ready GitHub API integration — complete

## Current Status: ✅ PRODUCTION READY

### Features Implemented:
- **Multi-context Kafka topology visualization**
- **GitHub-based topic contract loading**
- **Three-column pipeline layout (Producer→Topic→Consumer)**
- **Partition count display**
- **Interactive topic details panel**
- **Context-aware filtering**
- **Custom edge styling (produces vs consumes)**
- **Backstage app-config.yaml integration**
- **Standalone operation (no manual config needed)**

### Technical Stack:
- TypeScript + React
- react-flow-renderer for diagram visualization
- js-yaml for YAML parsing
- dagre for graph layout
- GitHub API integration
- Vite for development

### Next Steps (Future Enhancements):
- [ ] Add topic schema validation
- [ ] Implement topic search/filtering within contexts
- [ ] Add export functionality (PNG/SVG)
- [ ] Performance optimization for large topologies
- [ ] Add topic health indicators
- [ ] Implement cross-context topic relationships