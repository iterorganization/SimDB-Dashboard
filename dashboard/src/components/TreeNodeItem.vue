<script setup lang="ts">
import { computed } from 'vue'

interface TreeNode {
  path: string
  name: string
  dtype: string
  shape: number[]
  children?: TreeNode[]
  expanded?: boolean
  loading?: boolean
  cached?: boolean
  description?: string
  units?: string
  parent_path?: string
}

const props = defineProps<{
  node: TreeNode
  selected: boolean
}>()

const emit = defineEmits<{
  expand: [node: TreeNode]
  select: [node: TreeNode]
}>()

const primitiveTypes = /^(int32|int64|float32|float64|float128|bool|complex64|complex128|character|FLT)/i
const isStructure = computed(() => 
  props.node.dtype && !primitiveTypes.test(props.node.dtype) && props.node.dtype !== 'STR'
)
const hasChildren = computed(() => 
  props.node.children && props.node.children.length > 0
)
</script>

<template>
  <div class="tree-node">
    <div class="node-row" :class="{ selected }">
      <!-- Expand button (only for structures) -->
      <v-btn
        v-if="isStructure"
        icon
        size="x-small"
        variant="text"
        :loading="node.loading"
        @click="emit('expand', node)"
        class="expand-btn"
      >
        <v-icon>{{ node.expanded ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
      </v-btn>
      <div v-else class="expand-btn-placeholder"></div>

      <!-- Node Info -->
      <div
        class="node-info"
        @click="emit('select', node)"
      >
        <div class="node-name">{{ node.name }}</div>
        <div class="node-type">{{ node.dtype }} {{ node.shape.join(' × ') }}</div>
      </div>

      <!-- Cache indicator -->
      <v-icon
        v-if="node.cached && isStructure"
        size="small"
        color="success"
        title="Data cached"
      >
        mdi-database
      </v-icon>
    </div>

    <!-- Children (with lazy loading) -->
    <div v-if="isStructure && node.expanded && hasChildren" class="children">
      <TreeNodeItem
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :selected="selected && child === node"
        @expand="emit('expand', $event)"
        @select="emit('select', $event)"
      />
    </div>

    <!-- No children message -->
    <div v-if="isStructure && node.expanded && !hasChildren && !node.loading" class="empty-message">
      <v-icon size="small" color="grey">mdi-folder-open</v-icon>
      <span>No children</span>
    </div>
  </div>
</template>

<style scoped>
.tree-node {
  user-select: none;
}

.node-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.node-row:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.node-row.selected {
  background-color: rgba(33, 150, 243, 0.1);
  color: #2196f3;
}

.expand-btn {
  flex-shrink: 0;
  margin-left: -8px;
}

.expand-btn-placeholder {
  width: 40px;
  flex-shrink: 0;
}

.node-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.node-name {
  font-weight: 500;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-type {
  font-size: 0.8rem;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.children {
  margin-left: 16px;
  border-left: 1px solid rgba(0, 0, 0, 0.1);
  padding-left: 8px;
}

.empty-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 0.85rem;
  color: #999;
  margin-left: 40px;
}
</style>
