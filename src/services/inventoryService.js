import api from './api'

export const getInventoryStatus = async () => {
  const response = await api.get('/inventory/status')
  return response.data
}

export const getInventorySummary = async () => {
  const response = await api.get('/inventory/summary')
  return response.data
}

export const adjustInventory = async (data) => {
  const response = await api.post('/inventory/adjust', data)
  return response.data
}
