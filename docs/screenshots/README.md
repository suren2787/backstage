# Screenshots Directory

This directory contains screenshots for the main README.md documentation.

## Required Screenshots

### 1. `static-data-entities.png`
- **Description**: Catalog view showing all 62 entities imported from static-data repository
- **Location**: Backstage Catalog page (`http://localhost:3000/catalog`)
- **What to capture**: Entity list with filters showing Components, Groups, Domains, APIs
- **Tip**: Use browser developer tools (F12) to take full-page screenshot

### 2. `architecture-context-map.png`
- **Description**: Architecture viewer dashboard showing 10 bounded contexts and relationships
- **Location**: Architecture viewer (`http://localhost:7007/api/architecture/viewer`)
- **What to capture**: Full dashboard with all context cards and relationship lines
- **Tip**: Click "Refresh Data" button first to ensure latest data is loaded

### 3. `architecture-dashboard.png`
- **Description**: Same as architecture-context-map.png (alternative name used in README)
- **Location**: Architecture viewer (`http://localhost:7007/api/architecture/viewer`)
- **What to capture**: Full dashboard view

### 4. `kafka-topology.png`
- **Description**: Interactive Kafka topology visualization showing topics and producers/consumers
- **Location**: Kafka Topology page (`http://localhost:3000/kafka-topology`)
- **What to capture**: Full React Flow graph with all 7 bounded contexts
- **Tip**: Use zoom controls to fit entire graph in view before capturing

## How to Add Screenshots

1. **Take screenshots** of the running Backstage application at the URLs above
2. **Save images** in this directory with the exact filenames listed
3. **Verify** screenshots are referenced correctly in `README.md`:
   - `![Static Data Entities](docs/screenshots/static-data-entities.png)`
   - `![Architecture Context Map](docs/screenshots/architecture-context-map.png)`
   - `![Architecture Dashboard](docs/screenshots/architecture-dashboard.png)`
   - `![Kafka Topology](docs/screenshots/kafka-topology.png)`

## Screenshot Guidelines

- **Format**: PNG (preferred) or JPG
- **Resolution**: At least 1920x1080 for clarity
- **Content**: Ensure no sensitive data (credentials, private repos, etc.) is visible
- **Quality**: Clear, well-lit, with visible text and UI elements
- **Annotations**: Optional - add arrows/highlights for important features

## Tools for Taking Screenshots

- **Browser Built-in**: 
  - Chrome/Edge: F12 → Console → Cmd/Ctrl+Shift+P → "Capture full size screenshot"
  - Firefox: Right-click → "Take a Screenshot" → "Save full page"
- **macOS**: Cmd+Shift+4 (select area) or Cmd+Shift+3 (full screen)
- **Linux**: `gnome-screenshot` or `flameshot`
- **Windows**: Win+Shift+S (Snipping Tool)

## Current Status

- [ ] `static-data-entities.png` - Not yet added
- [ ] `architecture-context-map.png` - Not yet added
- [ ] `architecture-dashboard.png` - Not yet added
- [ ] `kafka-topology.png` - Not yet added

Once screenshots are added, update this checklist and remove this README or keep it as reference.
