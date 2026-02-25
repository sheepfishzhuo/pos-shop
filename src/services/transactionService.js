import api from './api'

export const getTransactions = async (startDate, endDate, cashierId) => {
  const params = {}
  if (startDate) params.startDate = startDate
  if (endDate) params.endDate = endDate
  if (cashierId) params.cashierId = cashierId
  
  const response = await api.get('/transactions', { params })
  return response.data
}

export const getTransaction = async (id) => {
  const response = await api.get(`/transactions/${id}`)
  return response.data
}

export const createTransaction = async (transaction) => {
  const response = await api.post('/transactions', transaction)
  return response.data
}

export const refundTransaction = async (transactionId, items) => {
  const response = await api.post(`/transactions/${transactionId}/refund`, { items })
  return response.data
}
