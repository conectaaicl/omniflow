import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
})

// ── Request: attach JWT ──────────────────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('omniflow_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// ── Response: handle 401 ────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('omniflow_token')
      localStorage.removeItem('omniflow_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ── Auth ─────────────────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) => {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    return api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },
  me: () => api.get('/auth/me'),
}

// ── Tenant ───────────────────────────────────────────────────
export const tenantAPI = {
  getPublicInfo: () => api.get('/tenants/public-info'),
  getSettings: () => api.get('/tenants/settings'),
  updateSettings: (data: Record<string, unknown>) => api.patch('/tenants/settings', data),
  getDashboardStats: () => api.get('/tenants/dashboard-stats'),
  register: (data: Record<string, unknown>) => api.post('/tenants/register', data),
}

// ── Conversations ────────────────────────────────────────────
export const conversationsAPI = {
  list: () => api.get('/conversations/'),
  getMessages: (id: number) => api.get(`/conversations/${id}/messages`),
  send: (id: number, content: string) =>
    api.post(`/conversations/${id}/send`, null, { params: { content } }),
}

// ── CRM ──────────────────────────────────────────────────────
export const crmAPI = {
  getPipeline: () => api.get('/crm/pipeline'),
  moveDeal: (dealId: number, targetStageId: number) =>
    api.patch(`/crm/deals/${dealId}/move`, null, { params: { target_stage_id: targetStageId } }),
}

// ── Billing ──────────────────────────────────────────────────
export const billingAPI = {
  getCurrent: () => api.get('/billing/current'),
  subscribe: (planId: number) => api.post(`/billing/subscribe/${planId}`),
  createMPPreference: (data: { plan: string; billing: string; email: string; subdomain: string }) =>
    api.post('/billing/create-preference', data),
}

// ── Admin ────────────────────────────────────────────────────
export const adminAPI = {
  getTenants: () => api.get('/admin/tenants'),
  getStats: () => api.get('/admin/stats'),
  getPlans: () => api.get('/admin/plans'),
  toggleTenant: (id: number) => api.patch(`/admin/tenants/${id}/toggle`),
  createTenant: (data: { name: string; subdomain: string; admin_email: string; password: string }) =>
    api.post('/admin/tenants', null, { params: data }),
}

// ── Legacy compat (used by BrandingProvider) ─────────────────
export const getPublicInfo = () => tenantAPI.getPublicInfo().then((r) => r.data)
export const updateSettings = (data: Record<string, unknown>) =>
  tenantAPI.updateSettings(data).then((r) => r.data)

export default api
