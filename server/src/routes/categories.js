import { Router } from 'express'
import { pool } from '../config/database.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.created_at as createdAt,
        COUNT(p.id) as productCount
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id, c.name, c.description, c.created_at
      ORDER BY c.created_at DESC
    `)

    res.json({
      success: true,
      data: rows,
    })
  } catch (error) {
    console.error('Get categories error:', error)
    res.status(500).json({
      success: false,
      message: '获取分类列表失败',
    })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const [rows] = await pool.execute(
      `SELECT 
        c.id,
        c.name,
        c.description,
        c.created_at as createdAt,
        COUNT(p.id) as productCount
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      WHERE c.id = ?
      GROUP BY c.id, c.name, c.description, c.created_at`,
      [id]
    )

    const category = rows[0]

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在',
      })
    }

    res.json({
      success: true,
      data: category,
    })
  } catch (error) {
    console.error('Get category error:', error)
    res.status(500).json({
      success: false,
      message: '获取分类详情失败',
    })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '分类名称不能为空',
      })
    }

    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString().split('T')[0]

    await pool.execute(
      'INSERT INTO categories (id, name, description, created_at) VALUES (?, ?, ?, ?)',
      [id, name, description || null, createdAt]
    )

    res.json({
      success: true,
      data: {
        id,
        name,
        description,
        productCount: 0,
        createdAt,
      },
      message: '添加分类成功',
    })
  } catch (error) {
    console.error('Create category error:', error)
    res.status(500).json({
      success: false,
      message: '添加分类失败',
    })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '分类名称不能为空',
      })
    }

    const [result] = await pool.execute(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '分类不存在',
      })
    }

    res.json({
      success: true,
      data: {
        id,
        name,
        description,
      },
      message: '更新分类成功',
    })
  } catch (error) {
    console.error('Update category error:', error)
    res.status(500).json({
      success: false,
      message: '更新分类失败',
    })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const [products] = await pool.execute(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [id]
    )

    if (products[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: '该分类下还有商品，无法删除',
      })
    }

    const [result] = await pool.execute('DELETE FROM categories WHERE id = ?', [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '分类不存在',
      })
    }

    res.json({
      success: true,
      message: '删除分类成功',
    })
  } catch (error) {
    console.error('Delete category error:', error)
    res.status(500).json({
      success: false,
      message: '删除分类失败',
    })
  }
})

export default router
