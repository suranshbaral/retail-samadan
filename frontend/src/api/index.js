import api from './client'

export const getBusinesses = () => api.get('/businesses/')
export const getLocations = (businessId) => api.get(`/locations/?business=${businessId}`)

export const getDashboard = (locationId, days = 30) =>
  api.get(`/dashboard/?location_id=${locationId}&days=${days}`)

export const getExpectedInventory = (locationId) =>
  api.get(`/inventory/expected/?location_id=${locationId}`)

export const getAlerts = (locationId) =>
  api.get(`/shrinkage-alerts/?location_id=${locationId}&resolved=false`)

export const runAudit = (locationId) =>
  api.get(`/audit/run/?location_id=${locationId}`)

export const getForecast = (locationId) =>
  api.get(`/forecast/?location_id=${locationId}`)

export const getSegmentation = (locationId, days = 30) =>
  api.get(`/segmentation/?location_id=${locationId}&days=${days}`)

export const uploadCSV = (formData) =>
  api.post('/import/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const detectMapping = (batchId) =>
  api.post('/import/detect-mapping/', { batch_id: batchId })

export const confirmMapping = (batchId, mapping) =>
  api.post('/import/confirm-mapping/', { batch_id: batchId, mapping })

export const getStaffingInsights = (locationId) =>
  api.get(`/staffing/insights/?location_id=${locationId}`)

export const getEmployees = (businessId) =>
  api.get(`/employees/?business=${businessId}`)

export const getShifts = (locationId, weekStart) =>
  api.get(`/shifts/?location_id=${locationId}&week_start=${weekStart}`)

export const createShift = (data) => api.post('/shifts/', data)
export const deleteShift = (id) => api.delete(`/shifts/${id}/`)
export const createEmployee = (data) => api.post('/employees/', data)