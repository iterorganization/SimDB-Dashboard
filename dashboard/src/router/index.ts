import { createRouter, createWebHistory } from 'vue-router'
import SearchView from '../components/SearchView.vue'
import DetailView from '../components/DetailView.vue'
import CompareView from '../components/CompareView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: SearchView },
    { path: '/uuid/:id', component: DetailView },
    { path: '/alias/:id', component: DetailView },
    { path: '/compare/', component: CompareView }
  ]
})

export default router
