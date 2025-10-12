# Kafka Topology Plugin

A Backstage plugin for visualizing Kafka topic topologies, designed for easy integration, lightweight operation, and extensibility.

## Features
- **Multi-context topology visualization**: See all bounded contexts and their Kafka topics in a single interactive graph.
- **Partition display**: Shows partition count for each topic, with clear layout and overflow handling.
- **Edge rendering**: Visualizes producer/consumer relationships between contexts and topics.
- **Config-driven**: Uses `app-config.yaml` for contracts URL and (optional) GitHub token—no entity annotations required.
- **GitHub integration**: Fetches topic contracts directly from public/private GitHub repositories.
- **Three-column layout**: Uses Dagre for clear separation of contexts, topics, and edges.
- **React Flow UI**: Modern, interactive graph with custom node types and handles.
- **Production-ready**: Minimal dependencies, fast builds, and easy deployment.
- **Topic filtering**: Search and filter topics by name in real-time.
- **Modern UI**: Clean, professional design with gradients, shadows, and responsive layout.

## Integration Status

✅ **Successfully integrated into Backstage!**

This plugin is now part of a complete Backstage workspace and can be easily exported to other Backstage instances.

## Usage in this Backstage Instance

1. **Start the development server**:
   ```bash
   yarn start
   ```

2. **Visit the plugin**: Navigate to `/kafka-topology` in your browser (http://localhost:3000/kafka-topology)

3. **Configure contracts source** (optional): Update `app-config.yaml`:
   ```yaml
   kafkaTopology:
     contractsUrl: "https://github.com/your-org/contracts"
     githubToken: "<your-github-token>" # Optional for public repos
   ```

## Exporting to Other Backstage Instances

### Option 1: Copy Plugin Directory (Recommended)

1. **Copy the plugin**:
   ```bash
   cp -r plugins/kafka-topology /path/to/target-backstage/plugins/
   ```

2. **Add to target workspace packages** in root `package.json`:
   ```json
   {
     "workspaces": {
       "packages": [
         "plugins/*",
         "packages/*"
       ]
     },
     "dependencies": {
       "@internal/plugin-kafka-topology": "workspace:*"
     }
   }
   ```

3. **Add plugin dependency** in target `packages/app/package.json`:
   ```json
   {
     "dependencies": {
       "@internal/plugin-kafka-topology": "workspace:*"
     }
   }
   ```

4. **Register the plugin** in target `packages/app/src/App.tsx`:
   ```tsx
   import { KafkaTopologyPage } from '@internal/plugin-kafka-topology';
   
   // Add route inside FlatRoutes:
   <Route path="/kafka-topology" element={<KafkaTopologyPage />} />
   ```

5. **Install dependencies**:
   ```bash
   yarn install
   yarn start
   ```

### Option 2: Publish as npm Package

1. **Build the plugin**:
   ```bash
   cd plugins/kafka-topology
   yarn build
   ```

2. **Publish to npm** (update package.json name first):
   ```bash
   npm publish
   ```

3. **Install in target Backstage**:
   ```bash
   yarn add @your-org/plugin-kafka-topology
   ```

4. **Import and use**:
   ```tsx
   import { KafkaTopologyPage } from '@your-org/plugin-kafka-topology';
   ```

4. **Import and use**:
   ```tsx
   import { KafkaTopologyPage } from '@your-org/plugin-kafka-topology';
   ```

## Development

### Local Development Commands

```bash
# Start development server
yarn dev

# Build plugin
yarn build

# Run tests
yarn test

# Lint code
yarn lint

# Clean build artifacts
yarn clean
```

### Plugin Structure

```
plugins/kafka-topology/
├── package.json          # Backstage plugin configuration
├── src/
│   ├── index.ts          # Main plugin exports
│   ├── plugin.ts         # Plugin definition
│   └── components/
│       ├── KafkaTopologyPage.tsx    # Main page component
│       ├── TopologyDiagram.tsx      # React Flow visualization
│       └── layout.ts                # Graph layout algorithm
├── public/
│   └── contracts/        # Sample contract files
└── README.md
```

## Configuration

### App Config (app-config.yaml)
```yaml
kafkaTopology:
  contractsUrl: "https://github.com/your-org/contracts"
  githubToken: "${GITHUB_TOKEN}" # Optional for private repos
```

### Environment Variables (.env)
```bash
VITE_GITHUB_TOKEN=your_github_token_here
VITE_GITHUB_OWNER=your-org
VITE_GITHUB_REPO=contracts
VITE_GITHUB_BRANCH=main
```

## Design Overview

- **Backstage Integration**: Full Backstage CLI support with proper plugin structure
- **GitHub Loader**: Fetches topic contracts from repositories with dual config support
- **React Flow Visualization**: Custom node types for topics with partition badges
- **Dagre Layout**: Three-column layout (Producers → Topics → Consumers)
- **Modern UI**: Professional design with gradients, filtering, and responsive layout
- **No Entity Dependencies**: Works without catalog entity annotations

## License
Apache-2.0

---

**🎉 Ready for production use in any Backstage instance!**

For questions or contributions, open an issue or pull request.

8. **Customization**
   - Update `contractsUrl` for your contracts repo
   - Add a `githubToken` for private repos (optional for public)
   - Style or extend the plugin as needed

   ## Planned Enhancements

   - Search/filter topics and contexts
   - Export topology as image/JSON
   - Health indicators for topics/contexts
   - Customizable node/edge styles

   ## Design Overview

   - Uses config-driven GitHub loader for topic contracts
   - React Flow custom node types for topics/partitions
   - Dagre layout for three-column graph
   - No entity annotations required

   ## Usage (Standalone)

   1. Configure `app-config.yaml` with your contracts repo URL and (optional) GitHub token
   2. Run the plugin locally with Vite
   3. View the topology diagram in your browser

   ---

   For more details, see the [docs](../../docs/) or contact the maintainers.
## License
MIT

---
For questions or contributions, open an issue or pull request on GitHub.
