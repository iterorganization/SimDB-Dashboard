# SimDB Dashboard - IBEX IDS Integration Implementation Guide

## ✅ Implementation Complete

The IBEX IDS integration has been successfully implemented in your SimDB Dashboard. Here's what was added:

---

## 📁 New Files Created

### 1. **API Service** (`src/api/ibexIdsAPI.ts`)
- `IBEXIdsAPI` class for communicating with IBEX backend
- Configured via proxy at `/api/ibex` (development)
- Methods:
  - `parseUri()` - Parse IMAS URIs
  - `listNodes()` - List all nodes in an IDS
  - `getNodeChildren()` - Get child nodes
  - `getFieldValue()` - Fetch field values for primitive types
  - `getPlotData()` - Fetch time-series data for plotting

### 2. **URI Utilities** (`src/utils/uriHelper.ts`)
- `parseIMASUri()` - Parse IMAS URI format
- `formatNodePath()` - Convert paths to readable labels
- `formatUri()` - Format URIs for display
- `isTimeSeriesUri()` - Detect time-series nodes
- `buildListUri()` / `buildNodeUri()` - Construct URIs for API calls
- `validateIMASUri()` - Validate URI format

### 3. **Components**

#### `IDSExplorer.vue` (Main Component)
- Handles URI parameter from route
- Fetches and displays list of nodes
- Auto-selects first node
- Error handling and loading states
- Breadcrumb navigation

#### `IDSNodeTree.vue` (Node Browser)
- Hierarchical tree view of IDS nodes
- Grouping by parent path
- Search/filter functionality
- Click to select node
- Shows data type and shape

#### `IDSNodePlot.vue` (Data Visualization)
- Displays time-series plots using Plotly
- Shows metadata (label, units, description)
- Statistics panel (min, max, mean, point count)
- Export data to CSV and JSON
- Responsive design

### 4. **Router Update** (`src/router/index.ts`)
- Added `/ids-explorer` route
- Named route: `ids-explorer`
- Accepts `uri` query parameter

### 5. **DetailView.vue Updates** 
- Imported `formatUri` from utilities
- Imported `useRouter` from Vue Router
- Added `navigateToIDS()` function - normalizes URIs and opens in new tab
- Added `isIMASUri()` helper function that checks:
  - URI starts with `imas:` (must be IMAS format)
  - `config.ibexEnabled === true` (IBEX feature must be enabled)
- Only IMAS URIs are clickable when IBEX integration is enabled
- Non-IMAS URIs or when feature is disabled: display as plain text
- Added styling for URI cells with hover effects

---

## 🔄 User Flow

```
1. User selects a simulation from list
   ↓
2. DetailView shows simulation metadata
   ↓
3. User sees Inputs/Outputs URIs as clickable links
   ↓
4. Click on URI
   ↓
5. Router navigates to IDSExplorer with URI parameter
   ↓
6. IDSExplorer:
   - Parses URI
   - Fetches list of nodes from IBEX
   - Displays tree view
   - Auto-selects first node
   ↓
7. IDSNodeTree shows all available nodes
   ↓
8. User clicks node
   ↓
9. If time-series:
   - Fetches plot data from IBEX
   - Shows plot with Plotly
   - Displays statistics
   - Export options (CSV/JSON)
   ↓
10. If multi-dimensional:
    - Shows metadata
    - Shows shape and dtype
    - Displays info message
```

---

## 🚀 Getting Started

### 1. Verify IBEX Server is Running

You can check if the IBEX server is accessible by testing the version endpoint:

```bash
curl http://localhost:6060/ids_info/version
```

Expected response: `200 OK` with version information

### 2. Enable IBEX Integration

Edit `src/config.ts` and set the flag to `true`:

```typescript
ibexEnabled: true
```

### 3. Restart Development Server

```bash
npm run dev
```

### 4. Test the Integration

1. Navigate to a simulation in DetailView
2. Look for "Inputs" or "Outputs" section
3. Click on any blue URI (IMAS URIs starting with `imas:`)
4. You should see the IDS Explorer page in a new tab

### 3. Example URI Format

```
imas:hdf5?path=/home/ITER/marood/public/imasdb/JINTRAC_SIMULATIONS/40acc396a74a11efa76fd4f5ef75e918/imasdb/iter/3/53301/2#summary:0/global_quantities/ip/value
```

Breakdown:
- **Protocol**: `imas:hdf5`
- **Path**: `/home/.../imasdb`
- **IDS**: `summary`
- **Occurrence**: `0`
- **Node**: `global_quantities/ip/value`

---

## 📊 API Endpoints Required

Your IBEX server at `http://localhost:6060` needs these endpoints:

### GET `/ids_info/version`
```
Parameters: none
Returns: Version information about the IBEX server
Note: Can be used to verify the server is running and accessible
```

### GET `/ids_info/list`
```
Parameters: uri (IMAS URI without node path)
Returns: { "nodes": [ { "path", "name", "dtype", "shape", "description", "units" } ] }
```

### GET `/ids_info/node_info`
```
Parameters: uri (full IMAS URI with node path)
Returns: { children array with node structure }
```

### GET `/data/field_value`
```
Parameters: 
  - uri (full IMAS URI)
  - downsampled_size (optional, not currently implemented)
Returns: 
  - String value for primitive types
  - Array for numeric arrays
  - Status 464 if no data available
```

### GET `/data/plot_data`
```
Parameters: 
  - uri (full IMAS URI)
  - downsampled_size (optional, not currently implemented)
Returns: TimeSeriesData object with values and metadata
```

---

## 🎯 Features Implemented

✅ **Node Browsing**
- Hierarchical tree view with lazy loading
- Caching for structure children
- Expandable/collapsible nodes
- Click to select and load data

✅ **Data Display**
- Primitive field values (strings, numbers)
- Numeric arrays as interactive plots
- Field metadata (path, dtype, shape, units)
- Special handling for "no data" scenarios (HTTP 464)

✅ **Data Caching**
- Structure node children cached by path
- Field value responses cached to avoid redundant API calls
- Automatic cache invalidation on new selections

✅ **URI Handling**
- Auto-normalization of old URI formats
- Default backend type (hdf5) for incomplete URIs
- Only IMAS URIs are clickable (others display as plain text)
- Opens in new browser tab

✅ **Error Handling**
- User-friendly error messages
- Loading states for async operations
- Special handling for "no data available" (HTTP 464)
- Graceful fallback for malformed data

✅ **Navigation**
- Breadcrumbs showing database/shot/run/ids
- Dynamic breadcrumb visibility (hides unknown values)
- Clickable links in DetailView Inputs/Outputs
- Back navigation through browser

---

## 🔧 Configuration

### Overview

The IBEX integration is controlled by a simple boolean flag in `src/config.ts`:

```typescript
ibexEnabled: false  // Set to true to enable IBEX integration
```

That's it! No complex server configurations needed.

### Runtime Configuration (`src/config.ts`)

Enable or disable IBEX integration with a single flag:

```typescript
const config = {
  api_version: '1.2',
  
  // SimDB servers configuration
  servers: [
    'https://simdb.iter.org/scenarios/api'
  ],
  serverConfig: {
    'https://simdb.iter.org/scenarios/api': { 'requiresAuth': false }
  },
  defaultServer: 'https://simdb.iter.org/scenarios/api',
  
  // IBEX Integration Configuration - Enable/Disable IBEX feature
  ibexEnabled: false,  // Toggle to true to enable, false to disable
  
  // ... other config ...
}
```

**Configuration Properties:**

| Property | Type | Options | Description |
|----------|------|---------|-------------|
| `ibexEnabled` | `boolean` | `true` / `false` | Enable/disable IBEX feature globally |

**Impact When Enabled (`ibexEnabled: true`):**
- ✅ IMAS URIs in DetailView become clickable links
- ✅ IDS Explorer route becomes accessible
- ✅ Users can browse and visualize IDS data

**Impact When Disabled (`ibexEnabled: false`):**
- ❌ IMAS URIs display as plain text (not clickable)
- ❌ IDS Explorer feature is unavailable
- ❌ Clicking URIs does nothing

### Build Configuration (`vite.config.ts`)

The Vite build configuration sets up the proxy for IBEX API calls:

```typescript
const config = {
  ibexBackend: {
    host: 'localhost',
    port: 6060,
    protocol: 'http'
  }
}

// In server.proxy:
server: {
  proxy: {
    '/api/ibex': {
      target: `${config.ibexBackend.protocol}://${config.ibexBackend.host}:${config.ibexBackend.port}`,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/ibex/, '')
    }
  }
}
```

**Why This Configuration Here?**
- Vite proxy is needed for development to avoid CORS issues
- Proxy settings are only for development (no runtime impact)
- The runtime `ibexEnabled` flag in `src/config.ts` controls the feature
- The proxy target in `vite.config.ts` controls where API requests are forwarded

### Changing Configuration

#### To Enable IBEX Integration:

1. Edit `src/config.ts`:
```typescript
ibexEnabled: true  // Enable IBEX feature
```

2. Restart the dev server:
```bash
npm run dev
```

That's all! IMAS URIs will now be clickable in DetailView.

#### To Disable IBEX Integration:

1. Edit `src/config.ts`:
```typescript
ibexEnabled: false  // Disable IBEX feature
```

2. Restart the dev server:
```bash
npm run dev
```

IMAS URIs will no longer be clickable.

#### To Change IBEX Backend URL (if needed):

Only edit `vite.config.ts`:

```typescript
const config = {
  ibexBackend: {
    host: 'your-host',      // Change hostname
    port: 6060,             // Change port if different
    protocol: 'https'       // Use https if needed
  }
}
```

Then restart the dev server.

**Note:** In production, the reverse proxy (nginx, Apache) handles URL routing, so no configuration changes are needed.

### SimDB Servers Configuration

The same pattern applies to SimDB servers:

```typescript
servers: [
  'https://simdb.iter.org/scenarios/api',
  // 'https://simdb.iter.org/itpa/api',
],
serverConfig: {
  'https://simdb.iter.org/scenarios/api': { 'requiresAuth': false },
  // 'https://simdb.iter.org/itpa/api': { 'requiresAuth': false },
}
```

**To Add a New SimDB Server:**

1. Add to `servers` array:
```typescript
servers: [
  'http://localhost:5000',
  'https://new-server.example.com/api'
]
```

2. Add to `serverConfig` with authentication settings:
```typescript
serverConfig: {
  'http://localhost:5000': { 'requiresAuth': false },
  'https://new-server.example.com/api': { 'requiresAuth': false }
}
```

### Proxy Configuration

The Vite development server configures proxy routes for IBEX API calls:

```typescript
server: {
  proxy: {
    '/api/ibex': {
      target: ibexUrl,        // Uses IBEX server URL
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/ibex/, '')
    }
  }
}
```

**How It Works:**
- Requests to `/api/ibex/*` are forwarded to the IBEX backend
- The `/api/ibex` prefix is removed before forwarding
- `changeOrigin: true` fixes CORS issues during development

**Example:**
- Browser request: `GET /api/ibex/ids_info/list?uri=...`
- Forwarded to: `GET http://localhost:6060/ids_info/list?uri=...`



---

## 📝 Component Props

### IDSNodeTree
```typescript
interface Props {
  nodes: IDSNode[]           // List of available nodes
  selected: IDSNode | null   // Currently selected node
}

interface Emits {
  select: [node: IDSNode]    // Emitted when user selects a node
}
```

### IDSNodePlot
```typescript
interface Props {
  plotData: TimeSeriesData   // Data to plot
  node: IDSNode              // Node metadata
}
```

---

## 📈 Performance Considerations

1. **Large Datasets**: Downsampling parameter is optional and not currently implemented
2. **Caching**: Automatic caching of:
   - Structure node children (by node.path)
   - Field values and plot data (by full URI)
3. **Lazy Loading**: Child nodes loaded only when expanded
4. **Background Normalization**: URI normalization happens on demand without affecting display

---

## 🔐 Security Notes

- URIs contain full filesystem paths - don't expose in logs
- IBEX server should have authentication in production
- Consider rate limiting for API calls
- Validate URI format before making API calls

---

## 🐛 Troubleshooting

### Configuration Issues

#### Issue: IMAS URIs are not clickable
**Solution**: Check if IBEX integration is enabled in `src/config.ts`

1. Verify `src/config.ts`:
```typescript
ibexEnabled: true  // Must be true
```

2. If disabled, enable it and restart the dev server:
```bash
npm run dev
```

3. The `isIMASUri()` function checks:
   - URI starts with `imas:` format
   - `config.ibexEnabled === true`

#### Issue: Configuration mismatch between files
**Solution**: Both files should have compatible IBEX backend settings

✅ **Correct Setup**:
```typescript
// src/config.ts
ibexEnabled: true

// vite.config.ts
const config = {
  ibexBackend: {
    host: 'localhost',
    port: 6060,
    protocol: 'http'
  }
}
```

**No need to keep URLs in sync** - The `src/config.ts` only controls enabling/disabling, while `vite.config.ts` just needs to point to the correct backend for the proxy.

#### Issue: Proxy error - "Failed to fetch from IBEX"
**Solution**: Verify proxy configuration and IBEX server

1. Check IBEX backend URL in `vite.config.ts`:
```typescript
const config = {
  ibexBackend: {
    host: 'localhost',      // Verify this is correct
    port: 6060,             // Verify this is correct
    protocol: 'http'        // Verify this is correct
  }
}
```

2. Test IBEX server is running:
```bash
curl http://localhost:6060/ids_info/version
```

3. Check browser console for detailed error messages
4. Verify firewall allows connection to IBEX backend
5. Restart dev server after changing URLs

### Issue: "No URI provided"
**Solution**: The IDSExplorer component didn't receive a URI parameter
- Ensure you're clicking on blue IMAS URIs from DetailView
- Non-IMAS URIs (plain text) are not clickable
- Check that router is properly configured

### Issue: CORS Error
**Solution**: IBEX server needs CORS headers configured

**IBEX Backend (Python/Flask)**:
```python
from flask_cors import CORS
CORS(app, resources={
    r"/ids_info/*": {"origins": "*"},
    r"/data/*": {"origins": "*"}
})
```

### Issue: "Failed to load nodes"
**Solution**: IBEX endpoint not responding

1. Check IBEX backend config in `src/config.ts`
2. Verify the IBEX server is accessible at the configured URL
3. Check browser console for detailed error
4. Verify URI format is valid

### Issue: "No data available" message
**Solution**: This is normal behavior for some nodes
- The backend returns HTTP 464 status to indicate no data
- The message from the server is displayed to the user
- This is not an error - it's informational

### Issue: Plot not showing
**Solution**: Node might be a structure type or unsupported format

- Structure types (STRUCT) show as expandable nodes
- Multi-dimensional arrays display as scalar values or text
- Check the node dtype in the UI
- Use browser console to see the actual response

### Issue: How to launch IBEX backend on specific port

**Solution**:
```python 
cd backend/
python -m venv venv
source venv/bin/activate
pip install -e .
./venv/bin/run_ibex_service -p 6060
```
---

