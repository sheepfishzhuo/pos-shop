import api from './api'

export const getProducts = async (search, category) => {
  const params = {}
  if (search) params.search = search
  if (category) params.category = category
  
  const response = await api.get('/products', { params })
  return response.data
}

export const getProduct = async (id) => {
  const response = await api.get(`/products/${id}`)
  return response.data
}

export const createProduct = async (product) => {
  const response = await api.post('/products', product)
  return response.data
}

export const updateProduct = async (id, product) => {
  const response = await api.put(`/products/${id}`, product)
  return response.data
}

export const deleteProduct = async (id) => {
  const response = await api.delete(`/products/${id}`)
  return response.data
}

export const setProductHot = async (id, isHot) => {
  const response = await api.put(`/products/${id}/hot`, { isHot })
  return response.data
}

export const getHotProducts = async () => {
  const response = await api.get('/products/hot/list')
  return response.data
}
