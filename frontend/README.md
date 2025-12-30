# SynqX Console - Premium ETL Orchestration UI

The SynqX Console is a high-fidelity, React-based management interface for the SynqX ETL Engine. It provides a "Glass Box" experience for designing, monitoring, and debugging complex data pipelines.

## ✨ High-Level Features

### 1. Visual DAG Orchestrator
- **Visual Editor**: Drag-and-drop node interface powered by React Flow.
- **Real-time Validation**: Instant feedback on DAG circularity and operator configuration requirements.
- **Version Control**: Manage immutable snapshots and perform instant rollbacks.

### 2. Forensic Terminal
- **Live Logs**: Watch execution logs stream in real-time via WebSockets.
- **Data Sniffing**: Inspect sample data snapshots at each node boundary to identify transformation bugs.
- **Resource Monitoring**: Track CPU and Memory utilization for every task in the graph.

### 3. Connection Registry
- **Discovery Engine**: Automated scanning of remote systems to identify tables, files, and API endpoints.
- **FQN Standard**: Unified handling of technical identifiers (Paths, Schemas, Prefixes) across different systems.
- **Dependency Management**: Manage isolated Python/Node environments for custom script execution directly from the UI.

### 4. Knowledge Base
- **Integrated Docs**: MDX-based technical reference accessible publicly.
- **Command Palette (⌘K)**: Global search for pipelines, connections, and documentation.

## 🚀 Tech Stack

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with Radix UI primitives
- **State Management**: React Query (TanStack) for server state
- **Visualization**: React Flow for DAG orchestration
- **Observability**: WebSocket-driven real-time updates

## 🛠️ Development

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure API endpoint in `.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```
3. Run development server:
   ```bash
   npm run dev
   ```

### Project Structure
- `src/components/features`: Domain-specific components (Pipelines, Connections, Jobs).
- `src/docs`: MDX technical documentation.
- `src/hooks`: Custom hooks for Auth, WebSockets, and real-time state.
- `src/lib`: API clients and type definitions.