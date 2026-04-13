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
  changePassword: (current_password: string, new_password: string) =>
    api.post('/auth/change-password', { current_password, new_password }),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, new_password: string) =>
    api.post('/auth/reset-password', { token, new_password }),
  switchTenant: (tenantId: number) =>
    api.post(`/auth/switch-tenant/${tenantId}`),
}

// ── Tenant ───────────────────────────────────────────────────
export const tenantAPI = {
  getPublicInfo: () => api.get('/tenants/public-info'),
  getSettings: () => api.get('/tenants/settings'),
  updateSettings: (data: Record<string, unknown>) => api.patch('/tenants/settings', data),
  getDashboardStats: () => api.get('/tenants/dashboard-stats'),
  register: (data: Record<string, unknown>) => api.post('/tenants/register', data),
  testWhatsapp: (to: string) => api.post('/tenants/test-whatsapp', { to }),
  refreshWhatsappToken: () => api.post('/tenants/refresh-whatsapp-token'),
}

// ── Conversations ────────────────────────────────────────────
export const conversationsAPI = {
  list: () => api.get('/conversations/'),
  getMessages: (id: number) => api.get(`/conversations/${id}/messages`),
  send: (id: number, content: string, contentType = 'text', mediaUrl?: string) =>
    api.post(`/conversations/${id}/send`, null, { params: { content, content_type: contentType, media_url: mediaUrl } }),
  toggleHandoff: (id: number, botActive: boolean) =>
    api.patch(`/conversations/${id}/handoff`, { bot_active: botActive }),
  saveNotes: (id: number, notes: string) =>
    api.patch(`/conversations/${id}/notes`, { notes }),
  assign: (id: number, userId: number | null) =>
    api.patch(`/conversations/${id}/assign`, { user_id: userId }),
  getCannedResponses: () => api.get('/conversations/canned-responses'),
  createCannedResponse: (data: { shortcut: string; title: string; content: string }) =>
    api.post('/conversations/canned-responses', data),
  deleteCannedResponse: (id: number) => api.delete(`/conversations/canned-responses/${id}`),
  getWhatsappTemplates: () => api.get('/conversations/whatsapp-templates'),
  sendWhatsappTemplate: (data: { conversation_id: number; template_name: string; language_code?: string; components?: unknown[] }) =>
    api.post('/conversations/whatsapp-templates/send', data),
  importContacts: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/conversations/contacts/import-csv', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

// ── CRM ──────────────────────────────────────────────────────
export const crmAPI = {
  getPipeline: () => api.get('/crm/pipeline'),
  moveDeal: (dealId: number, targetStageId: number) =>
    api.patch(`/crm/deals/${dealId}/move`, null, { params: { target_stage_id: targetStageId } }),
  getContacts: (params?: { search?: string; source?: string; limit?: number; offset?: number }) =>
    api.get('/crm/contacts', { params }),
  updateContact: (id: number, data: Record<string, unknown>) =>
    api.patch(`/crm/contacts/${id}`, data),
}

// ── Billing ──────────────────────────────────────────────────
export const billingAPI = {
  getCurrent: () => api.get('/billing/current'),
  subscribe: (planId: number) => api.post(`/billing/subscribe/${planId}`),
  createMPPreference: (data: { plan: string; billing: string; email: string; subdomain: string }) =>
    api.post('/billing/create-preference', data),
}

// ── Team / Users ─────────────────────────────────────────────
export const usersAPI = {
  list: () => api.get('/users/'),
  listRoles: () => api.get('/users/roles/'),
  create: (data: { full_name: string; email: string; password: string; role_id?: number | null; is_active?: boolean }) =>
    api.post('/users/', data),
  update: (id: number, data: { full_name?: string; email?: string; role_id?: number | null; is_active?: boolean }) =>
    api.patch(`/users/${id}`, data),
  setPassword: (id: number, new_password: string) =>
    api.post(`/users/${id}/set-password`, { new_password }),
  deactivate: (id: number) => api.delete(`/users/${id}`),
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

// ── Broadcasts ───────────────────────────────────────────────
export const broadcastsAPI = {
  list: () => api.get('/broadcasts/'),
  create: (data: { name: string; channel: string; message: string; filter_tag?: string | null }) =>
    api.post('/broadcasts/', data),
  send: (id: number) => api.post(`/broadcasts/${id}/send`),
  remove: (id: number) => api.delete(`/broadcasts/${id}`),
}

// ── Channels ─────────────────────────────────────────────────
export const channelsAPI = {
  status: () => api.get('/channels/status'),
  connectInstagram: (data: { page_id: string; access_token: string; verify_token?: string }) =>
    api.post('/channels/instagram', data),
  disconnectInstagram: () => api.delete('/channels/instagram'),
  connectFacebook: (data: { page_id: string; access_token: string; verify_token?: string }) =>
    api.post('/channels/facebook', data),
  disconnectFacebook: () => api.delete('/channels/facebook'),
  connectTelegram: (data: { bot_token: string; bot_username?: string }) =>
    api.post('/channels/telegram', data),
  disconnectTelegram: () => api.delete('/channels/telegram'),
  connectWhatsappManual: (data: { phone_number_id: string; waba_id: string; access_token: string; phone_number?: string }) =>
    api.post('/channels/whatsapp/manual', data),
  disconnectWhatsapp: () => api.delete('/channels/whatsapp'),
  embeddedSignup: (data: { code: string; phone_number_id?: string; waba_id?: string }) =>
    api.post('/channels/whatsapp/embedded-signup', data),
}

// ── Legacy compat (used by BrandingProvider) ─────────────────
export const getPublicInfo = () => tenantAPI.getPublicInfo().then((r) => r.data)
export const updateSettings = (data: Record<string, unknown>) =>
  tenantAPI.updateSettings(data).then((r) => r.data)

export default api
