<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ibexIdsAPI } from '../api/ibexIdsAPI'
import type { IDSNode, TimeSeriesData } from '../api/ibexIdsAPI'
import { parseIMASUri, formatNodePath, isTimeSeriesUri, buildNodeUri } from '../utils/uriHelper'
import IDSNodePlot from './IDSNodePlot.vue'
import TreeNodeItem from './TreeNodeItem.vue'

// Enhanced node with caching and tree structure
interface TreeNode extends IDSNode {
  children?: TreeNode[]
  expanded?: boolean
  loading?: boolean
  cached?: boolean
}

const route = useRoute()
const uri = ref<string>('')
const parsedUri = ref<any>(null)
const nodes = ref<TreeNode[]>([])
const selectedNode = ref<TreeNode | null>(null)
const selectedChild = ref<TreeNode | null>(null)
const plotData = ref<TimeSeriesData | null>(null)
const stringValue = ref<string | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const nodeCache = new Map<string, TreeNode[]>()
const fieldValueCache = new Map<string, string | TimeSeriesData>()

onMounted(async () => {
  // Get URI from route parameter
  uri.value = (route.query.uri as string) || (route.params.uri as string)
  
  if (!uri.value) {
    error.value = 'No URI provided. Please provide a valid IMAS URI.'
    return
  }

  await loadNodes()
})

async function loadNodes() {
  isLoading.value = true
  error.value = null
  
  try {
    parsedUri.value = parseIMASUri(uri.value)
    
    // Pass the original URI directly to IBEX backend
    // Don't reconstruct it - IBEX expects the simplified format
    const loadedNodes = await ibexIdsAPI.listNodes(uri.value)
    
    // Convert to TreeNodes with expanded=false initially
    nodes.value = loadedNodes.map(node => ({
      ...node,
      children: undefined,
      expanded: false,
      loading: false,
      cached: false
    }))
  } catch (err: any) {
    console.error('Error loading nodes:', err)
    error.value = err.message || 'Failed to load nodes'
  } finally {
    isLoading.value = false
  }
}

// Lazy load and cache children when expanding a node
async function expandNode(node: TreeNode) {
  if (node.expanded === undefined) {
    node.expanded = false
  }
  
  // Toggle expansion
  node.expanded = !node.expanded
  
  // If expanding and children not cached, fetch them
  if (node.expanded && !node.cached) {
    await loadNodeChildren(node)
  }
}

async function loadNodeChildren(node: TreeNode) {
  node.loading = true
  // Use the full path as cache key to handle nested structures
  const cacheKey = `${node.path}`
  
  try {
    // Check cache first
    if (nodeCache.has(cacheKey)) {
      const cachedChildren = nodeCache.get(cacheKey)
      // Use Object.assign to ensure reactivity
      Object.assign(node, {
        children: cachedChildren,
        cached: true,
        loading: false
      })
      return
    }
    
    // Fetch children
    const primitiveTypes = /^(int32|int64|float32|float64|float128|bool|complex64|complex128|character|FLT)/i
    const isStructureType = node.dtype && !primitiveTypes.test(node.dtype) && node.dtype !== 'STR'
    
    let children: TreeNode[] = []
    
    if (isStructureType) {
      // For structure types, load their child nodes using node_info
      children = await loadStructureChildrenData(node)
    } else {
      // For leaf nodes (non-structure), load regular children
      children = await loadRegularChildrenData(node)
    }
    
    // Cache the results
    nodeCache.set(cacheKey, children)
    
    // Use Object.assign to ensure Vue reactivity
    Object.assign(node, {
      children: children,
      cached: true,
      loading: false
    })
  } catch (err: any) {
    console.error('Error loading children:', err)
    error.value = `Failed to load children: ${err.message || err}`
    node.loading = false
  }
}

async function loadRegularChildrenData(node: TreeNode): Promise<TreeNode[]> {
  const children = await ibexIdsAPI.getNodeChildren(uri.value, node.name)
  
  return children.map(child => ({
    ...child,
    children: undefined,
    expanded: false,
    loading: false,
    cached: false
  }))
}

async function loadStructureChildrenData(node: TreeNode): Promise<TreeNode[]> {
  // Find the root IDS node that contains this node
  let rootIdsName = ''
  let isRootNode = false
  
  for (const rootNode of nodes.value) {
    if (rootNode.path === node.path) {
      // This is a root node
      rootIdsName = rootNode.name
      isRootNode = true
      break
    } else if (isChildOfNode(rootNode, node)) {
      // This is a child node
      rootIdsName = rootNode.name
      isRootNode = false
      break
    }
  }
  
  if (!rootIdsName) {
    throw new Error('Could not determine root IDS name for this node')
  }
  
  // Build the full path for the API call
  // For root IDS nodes, only use the IDS name
  // For child nodes, use root name + full path
  const fullPath = isRootNode ? rootIdsName : `${rootIdsName}/${node.path}`
  
  const structureUri = `${uri.value}#${fullPath}`
  
  const params = new URLSearchParams()
  params.append('uri', structureUri)
  params.append('show_error_bars', 'true')
  
  const response = await ibexIdsAPI.client.get('/ids_info/node_info', { params })
  
  console.log('Structure node info response:', response.data)
  
  const children: TreeNode[] = []
  
  const extractNodes = (data: any, prefix = '') => {
    if (Array.isArray(data)) {
      data.forEach((item: any) => {
        if (item.name) {
          const childNamePath = prefix ? `${prefix}/${item.name}` : item.name
          // For root nodes, path is just the child name
          // For child nodes, path includes the parent path + child name
          const childPath = isRootNode ? childNamePath : `${node.path}/${childNamePath}`
          
          children.push({
            path: childPath,
            name: item.name,
            dtype: item.type || item.dtype || 'unknown',
            shape: item.shape || [item.ndim || 0],
            description: item.description,
            units: item.units,
            children: undefined,
            expanded: false,
            loading: false,
            cached: false
          })
        }
        if (item.children) {
          const newPrefix = prefix ? `${prefix}/${item.name}` : item.name
          extractNodes(item.children, newPrefix)
        }
      })
    } else if (data && typeof data === 'object') {
      if (data.children) {
        extractNodes(data.children, prefix)
      }
    }
  }
  
  extractNodes(response.data)
  
  return children
}

async function selectChild(child: TreeNode) {
  selectedChild.value = child
  plotData.value = null
  stringValue.value = null
  
  // Check the data type and determine what action to take
  const primitiveTypes = /^(int32|int64|float32|float64|float128|bool|complex64|complex128|character|FLT)/i
  const isStructureType = child.dtype && !primitiveTypes.test(child.dtype) && child.dtype !== 'STR'
  
  if (isStructureType) {
    // If it's a structure type, load and expand to show children
    // Use the same logic as expandNode
    await loadNodeChildren(child)
    // Mark it as expanded so it shows as expanded in the UI
    child.expanded = true
  } else {
    // For all primitive types (FLT, INT32, STR, etc.), load field value
    await loadFieldValue(child)
  }
}

async function loadFieldValue(child: TreeNode) {
  try {
    // Get the root IDS name by looking at the node's path
    let rootIdsName = ''
    let isRootNode = false
    
    // Search through all root nodes to find which one contains this child
    for (const rootNode of nodes.value) {
      if (rootNode.path === child.path) {
        // This is a root node
        rootIdsName = rootNode.name
        isRootNode = true
        break
      } else if (isChildOfNode(rootNode, child)) {
        rootIdsName = rootNode.name
        isRootNode = false
        break
      }
    }
    
    if (!rootIdsName) {
      error.value = 'Could not determine root IDS name for this node'
      return
    }
    
    // Construct the URI with the correct path
    // For root nodes: uri#rootName
    // For child nodes: uri#rootName/childPath
    const uriPath = isRootNode ? rootIdsName : `${rootIdsName}/${child.path}`
    const fieldUri = `${uri.value}#${uriPath}`
    
    // Check cache first
    const cacheKey = fieldUri
    if (fieldValueCache.has(cacheKey)) {
      console.log(`Using cached field value for ${child.path}`)
      const cachedValue = fieldValueCache.get(cacheKey)
      
      // Check if it's plot data or string value
      if (typeof cachedValue === 'string') {
        stringValue.value = cachedValue
        plotData.value = null
      } else {
        plotData.value = cachedValue as TimeSeriesData
        stringValue.value = null
      }
      error.value = null
      return
    }
    
    // Call field_value endpoint for all primitive types
    const params = new URLSearchParams()
    params.append('uri', fieldUri)
    params.append('downsampled_size', '1000')
    
    const response = await ibexIdsAPI.client.get('/data/field_value', { params })
    
    // Extract the actual data value
    let responseValue = response.data?.data || response.data?.value || response.data
    
    // Check if the response is an array
    if (Array.isArray(responseValue)) {
      console.log('Response is an array, treating as plot data')
      
      // For numeric array types (FLT, int, complex, etc.), display as plot
      const numericArrayTypes = /^(int32|int64|float32|float64|float128|complex64|complex128|FLT)/i
      if (numericArrayTypes.test(child.dtype)) {
        // Call plot_data endpoint instead
        await loadPlotData(child)
        return
      } else {
        // For non-numeric arrays, display as string
        stringValue.value = String(responseValue)
        error.value = null
        // Cache the string value
        fieldValueCache.set(cacheKey, String(responseValue))
      }
    } else {
      // For scalar values or strings, display directly
      stringValue.value = String(responseValue)
      error.value = null
      // Cache the string value
      fieldValueCache.set(cacheKey, String(responseValue))
    }
  } catch (err: any) {
    // Check if error response has status 464
    if (err.response?.status === 464 && err.response?.data?.message) {
      // Display the message without error banner
      stringValue.value = err.response.data.message
      error.value = null
      console.log('No data available:', err.response.data.message)
    } else {
      error.value = `Failed to load field value: ${err.message || err}`
    }
    console.error('Error loading field value:', err)
  }
}

async function loadPlotData(child: TreeNode) {
  try {
    // Get the root IDS name by looking at the node's path
    let rootIdsName = ''
    let isRootNode = false
    
    // Search through all root nodes to find which one contains this child
    for (const rootNode of nodes.value) {
      if (rootNode.path === child.path) {
        // This is a root node
        rootIdsName = rootNode.name
        isRootNode = true
        break
      } else if (isChildOfNode(rootNode, child)) {
        rootIdsName = rootNode.name
        isRootNode = false
        break
      }
    }
    
    if (!rootIdsName) {
      error.value = 'Could not determine root IDS name for this node'
      return
    }
    
    // Construct the URI with the correct path
    // For root nodes: uri#rootName
    // For child nodes: uri#rootName/childPath
    const uriPath = isRootNode ? rootIdsName : `${rootIdsName}/${child.path}`
    const dataUri = `${uri.value}#${uriPath}`
    
    // Check cache first
    const cacheKey = dataUri
    if (fieldValueCache.has(cacheKey)) {
      console.log(`Using cached plot data for ${child.path}`)
      const cachedValue = fieldValueCache.get(cacheKey)
      if (typeof cachedValue !== 'string') {
        plotData.value = cachedValue as TimeSeriesData
        stringValue.value = null
        error.value = null
        return
      }
    }
    
    // Fetch plot data
    plotData.value = await ibexIdsAPI.getPlotData(dataUri, false)
    stringValue.value = null
    error.value = null
    
    // Cache the plot data
    fieldValueCache.set(cacheKey, plotData.value)
  } catch (err: any) {
    // Check if error response has status 464
    if (err.response?.status === 464 && err.response?.data?.message) {
      // Display the message without error banner
      stringValue.value = err.response.data.message
      error.value = null
      console.log('No data available:', err.response.data.message)
    } else {
      error.value = `Failed to load plot data: ${err.message || err}`
    }
    console.error('Error loading plot data:', err)
  }
}

// Helper function to check if a node is a descendant of another node
function isChildOfNode(parent: TreeNode, target: TreeNode): boolean {
  if (!parent.children) return false
  
  for (const child of parent.children) {
    if (child.path === target.path) return true
    if (isChildOfNode(child, target)) return true
  }
  
  return false
}

const breadcrumbs = computed(() => {
  if (!parsedUri.value) return []
  
  const items = []
  
  // Only add database if it's not 'unknown'
  if (parsedUri.value.database && parsedUri.value.database !== 'unknown') {
    items.push({ title: parsedUri.value.database, disabled: false })
  }
  
  // Only add shot if it's a valid number (> 0)
  if (parsedUri.value.shot && parsedUri.value.shot > 0) {
    items.push({ title: `Shot ${parsedUri.value.shot}`, disabled: false })
  }
  
  // Only add run if it's a valid number (> 0)
  if (parsedUri.value.run && parsedUri.value.run > 0) {
    items.push({ title: `Run ${parsedUri.value.run}`, disabled: false })
  }
  
  // Always add the current IDS
  items.push({ title: 'Available IDSes', disabled: true })
  
  return items
})
</script>

<template>
  <v-container class="py-4">
    <!-- Header -->
    
    <!-- Error Alert -->
    <v-alert v-if="error" type="error" closable class="mb-4">
      <strong>Error:</strong> {{ error }}
    </v-alert>

    <!-- Loading -->
    <v-progress-linear v-if="isLoading" indeterminate></v-progress-linear>

    <!-- Main Content -->
    <v-row v-if="!isLoading" class="mt-4">
      <!-- Tree View -->
      <v-col cols="12" md="4">
        <v-card>
          <!-- <v-card-title class="text-h6">Data Tree</v-card-title> -->
          <v-divider></v-divider>
          <v-card-text class="tree-view-container">
            <v-list>
              <template v-for="node in nodes" :key="node.path">
                <TreeNodeItem
                  :node="node"
                  :selected="selectedNode === node || selectedChild === node"
                  @expand="expandNode"
                  @select="selectChild"
                />
              </template>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Node Details & Plot -->
      <v-col cols="12" md="8">
        <v-card v-if="selectedChild">
          <v-card-title>{{ selectedChild.name }}</v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <!-- Node Metadata -->
            <div class="mb-4">
              <p><strong>Path:</strong> <code>{{ selectedChild.path }}</code></p>
              <p><strong>Data Type:</strong> <code>{{ selectedChild.dtype }}</code></p>
              <p><strong>Shape:</strong> <code>{{ selectedChild.shape.join(' × ') }}</code></p>
              <p v-if="selectedChild.units"><strong>Units:</strong> {{ selectedChild.units }}</p>
              <p v-if="selectedChild.description" class="text-grey">{{ selectedChild.description }}</p>
            </div>

            <!-- Plot (if data available) -->
            <IDSNodePlot
              v-if="plotData"
              :plot-data="plotData"
              :node="selectedChild"
            />

            <!-- String value (if available) -->
            <v-card v-if="stringValue" class="mb-4" variant="outlined">
              <v-card-title>{{ selectedChild?.name }}</v-card-title>
              <v-divider></v-divider>
              <v-card-text>
                <p class="text-caption text-grey">String Value</p>
                <p class="font-monospace text-break">{{ stringValue }}</p>
              </v-card-text>
            </v-card>

            <!-- No data message -->
            <v-alert v-else-if="!plotData" type="info" class="mt-4">
              <strong>Note:</strong> Select a node to view time-series data or expand structures.
            </v-alert>
          </v-card-text>
        </v-card>

        <v-card v-else class="text-center py-8">
          <v-icon size="48" class="text-grey">mdi-folder-open</v-icon>
          <p class="text-grey mt-2">Select a node to view details</p>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-row v-if="!isLoading && nodes.length === 0 && !error">
      <v-col cols="12" class="text-center py-8">
        <v-icon size="48" class="text-grey">mdi-alert</v-icon>
        <p class="text-grey mt-2">No nodes found in this IDS</p>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
code {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.85em;
}

.tree-view-container {
  min-height: 700px;  
  max-height: 700px;
  overflow-y: auto;
  overflow-x: hidden;
}

.tree-view-container::-webkit-scrollbar {
  width: 8px;
}

.tree-view-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.tree-view-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.tree-view-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
</style>
