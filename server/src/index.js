import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import productRoutes from './routes/products.js'
import transactionRoutes from './routes/transactions.js'
import authRoutes from './routes/auth.js'
import inventoryRoutes from './routes/inventory.js'
import reportRoutes from './routes/reports.js'
import categoryRoutes from './routes/categories.js'
import memberRoutes from './routes/members.js'
import systemRoutes from './routes/system.js'
import logsRoutes from './routes/logs.js'
import permissionRoutes from './routes/permissions.js'
import promotionRoutes from './routes/promotions.js'
import pointRoutes from './routes/points.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/members', memberRoutes)
app.use('/api/system', systemRoutes)
app.use('/api/logs', logsRoutes)
app.use('/api/permissions', permissionRoutes)
app.use('/api/promotions', promotionRoutes)
app.use('/api/points', pointRoutes)

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
})

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`)
  console.log(`📊 API文档: http://localhost:${PORT}/api/health`)
})

export default app
