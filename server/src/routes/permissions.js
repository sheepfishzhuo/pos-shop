import { Router } from 'express'
import { pool } from '../config/database.js'
import { logOperation } from './logs.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM permissions ORDER BY name'
    )
    res.json({
      success: true,
      data: rows,
    })
  } catch (error) {
    console.error('获取权限列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.get('/role/:role', async (req, res) => {
  try {
    const { role } = req.params
    const [rows] = await pool.execute(
      `SELECT p.* FROM permissions p 
       JOIN role_permissions rp ON p.id = rp.permission_id 
       WHERE rp.role = ?`,
      [role]
    )
    res.json({
      success: true,
      data: rows,
    })
  } catch (error) {
    console.error('获取角色权限错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.put('/role/:role', async (req, res) => {
  try {
    const { role } = req.params
    const { permissions } = req.body

    await pool.execute(
      'DELETE FROM role_permissions WHERE role = ?',
      [role]
    )

    if (permissions && permissions.length > 0) {
      const values = permissions.map(p => [crypto.randomUUID(), role, p])
      const placeholders = values.map(() => '(?, ?, ?)').join(',')
      await pool.execute(
        `INSERT INTO role_permissions (id, role, permission_id) VALUES ${placeholders}`,
        values.flat()
      )
    }

    logOperation({
      userId: null,
      userName: 'system',
      action: 'update',
      module: 'system',
      description: `更新角色权限: ${role}`,
      ipAddress: req.ip,
    })

    res.json({
      success: true,
      message: '权限更新成功',
    })
  } catch (error) {
    console.error('更新角色权限错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const [userRows] = await pool.execute(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    )

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      })
    }

    const role = userRows[0].role
    const [rows] = await pool.execute(
      `SELECT p.code FROM permissions p 
       JOIN role_permissions rp ON p.id = rp.permission_id 
       WHERE rp.role = ?`,
      [role]
    )

    res.json({
      success: true,
      data: {
        role,
        permissions: rows.map(r => r.code),
      },
    })
  } catch (error) {
    console.error('获取用户权限错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

export default router
