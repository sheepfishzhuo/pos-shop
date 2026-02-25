import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pos_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

export async function testConnection() {
  try {
    const connection = await pool.getConnection()
    console.log('✅ 数据库连接成功')
    connection.release()
  } catch (error) {
    console.error('❌ 数据库连接失败:', error)
    throw error
  }
}
