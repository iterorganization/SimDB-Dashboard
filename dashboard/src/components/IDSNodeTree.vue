<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { IDSNode } from '../api/ibexIdsAPI'
import { formatNodePath } from '../utils/uriHelper'

const props = defineProps<{
  nodes: IDSNode[]
  selected: IDSNode | null
}>()

const emit = defineEmits<{
  select: [node: IDSNode]
}>()

const expandedGroups = ref<Set<string>>(new Set())
const searchQuery = ref('')

// Group nodes by parent path
const groupedNodes = computed(() => {
  const groups: { [key: string]: IDSNode[] } = {}
  
  const filtered = props.nodes.filter(node => {
    if (!searchQuery.value) return true
    return node.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
           node.path.toLowerCase().includes(searchQuery.value.toLowerCase())
  })
  
  filtered.forEach(node => {
    const parent = node.parent_path || 'root'
    if (!groups[parent]) {
      groups[parent] = []
    }
    groups[parent].push(node)
  })
  
  return groups
})

function toggleGroup(parent: string | number) {
  const parentStr = String(parent)
  if (expandedGroups.value.has(parentStr)) {
    expandedGroups.value.delete(parentStr)
  } else {
    expandedGroups.value.add(parentStr)
  }
}

function selectNode(node: IDSNode) {
  emit('select', node)
}

onMounted(() => {
  // Expand first group by default
  const firstGroup = Object.keys(groupedNodes.value)[0]
  if (firstGroup) {
    expandedGroups.value.add(firstGroup)
  }
})
</script>

<template>
  <div class="ids-tree">
    <!-- Search -->
    <v-text-field
      v-model="searchQuery"
      placeholder="Search nodes..."
      variant="outlined"
      density="compact"
      clearable
      class="mb-3"
      prepend-inner-icon="mdi-magnify"
    ></v-text-field>

    <!-- Tree -->
    <div v-if="Object.keys(groupedNodes).length > 0">
      <div v-for="(nodeList, parent) in groupedNodes" :key="parent">
        <!-- Group Header -->
        <div class="group-header" @click="toggleGroup(parent)">
          <v-icon size="small" class="mr-2">
            {{ expandedGroups.has(String(parent)) ? 'mdi-chevron-down' : 'mdi-chevron-right' }}
          </v-icon>
          <span class="font-weight-bold">{{ formatNodePath(String(parent)) }}</span>
          <v-chip size="small" variant="outlined" class="ml-auto">
            {{ nodeList.length }}
          </v-chip>
        </div>

        <!-- Nodes in Group -->
        <transition-group v-if="expandedGroups.has(String(parent))" name="list" tag="div">
          <div
            v-for="node in nodeList"
            :key="node.path"
            class="node-item"
            :class="{ active: selected?.path === node.path }"
            @click="selectNode(node)"
          >
            <v-icon size="x-small" class="mr-2">mdi-leaf</v-icon>
            <span class="node-name">{{ node.name }}</span>
            <v-spacer></v-spacer>
            <v-chip size="x-small" variant="text" class="ml-2">
              {{ node.dtype }}
            </v-chip>
          </div>
        </transition-group>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8">
      <v-icon size="48" class="text-grey">mdi-folder-open</v-icon>
      <p class="text-grey mt-2">No nodes found</p>
    </div>
  </div>
</template>

<style scoped>
.ids-tree {
  max-height: 600px;
  overflow-y: auto;
}

.group-header {
  display: flex;
  align-items: center;
  padding: 8px 4px;
  cursor: pointer;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  margin-top: 8px;
  transition: background-color 0.2s;
}

.group-header:hover {
  background: rgba(0, 0, 0, 0.04);
}

.node-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  margin: 4px 0;
  cursor: pointer;
  border-radius: 4px;
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
}

.node-item:hover {
  background: rgba(0, 0, 0, 0.04);
  border-left-color: var(--v-primary-base);
}

.node-item.active {
  background: rgba(33, 150, 243, 0.1);
  border-left-color: var(--v-primary-base);
  font-weight: 500;
}

.node-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>
