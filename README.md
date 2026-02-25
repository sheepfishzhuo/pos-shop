# 智慧收银系统 (Smart POS)

<p align="center">
  <strong>一个专业的桌面POS超市收银系统</strong>
</p>

<p align="center">
  基于 Electron + React + MySQL 构建，配备完整的后端API服务
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-28.x-47848F?style=flat-square&logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Node.js-18.x-339933?style=flat-square&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql" alt="MySQL">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

---

## 功能特性

### 核心模块

| 模块 | 功能描述 |
|------|----------|
| **收银台** | 快速商品搜索、扫码枪支持、购物车管理、多种支付方式、会员选择、优惠券核销 |
| **商品管理** | 商品增删改查、分类管理、条码管理、成本管理、热门商品设置 |
| **库存管理** | 实时库存监控、库存预警、库存调整记录 |
| **会员管理** | 会员信息管理、积分系统、余额充值、积分兑换、会员等级 |
| **交易记录** | 交易历史查询、交易详情、退款功能 |
| **促销活动** | 满减活动、特价商品、组合套餐、优惠券管理 |
| **积分商城** | 积分商品管理、积分兑换记录 |
| **报表统计** | 销售趋势、分类占比、热销商品分析、日报表 |
| **系统管理** | 用户管理、权限控制、交接班、操作日志 |

### 权限控制

| 角色 | 权限范围 |
|------|----------|
| **管理员** | 全部权限 |
| **经理** | 收银、商品、库存、会员、交易、报表、促销、打折、退款、查看成本 |
| **收银员** | 收银、交易查看、交接班 |

---

## 技术栈

### 前端
- **Electron** - 跨平台桌面应用框架
- **React 18** - 现代化UI框架
- **Vite** - 快速构建工具
- **Ant Design** - 企业级UI组件库
- **Zustand** - 轻量级状态管理
- **Axios** - HTTP请求库

### 后端
- **Node.js + Express** - 服务端框架
- **MySQL** - 关系型数据库
- **JWT** - 身份认证
- **bcryptjs** - 密码加密

---

## 项目结构

```
shop/
├── electron/                  # Electron主进程
│   ├── main.js               # 主进程入口
│   └── preload.js            # 预加载脚本
├── src/                      # React前端代码
│   ├── layouts/              # 布局组件
│   │   ├── MainLayout.jsx    # 主布局
│   │   └── MainLayout.css    # 布局样式
│   ├── pages/                # 页面组件
│   │   ├── Cashier.jsx       # 收银台
│   │   ├── Products.jsx      # 商品管理
│   │   ├── Categories.jsx    # 分类管理
│   │   ├── Inventory.jsx     # 库存管理
│   │   ├── Members.jsx       # 会员管理
│   │   ├── Transactions.jsx  # 交易记录
│   │   ├── Promotions.jsx    # 促销活动
│   │   ├── PointProducts.jsx # 积分商品
│   │   ├── Reports.jsx       # 报表统计
│   │   ├── Users.jsx         # 用户管理
│   │   ├── Permissions.jsx   # 权限管理
│   │   ├── Shift.jsx         # 交接班
│   │   ├── Logs.jsx          # 操作日志
│   │   ├── Settings.jsx      # 系统设置
│   │   └── Login.jsx         # 登录页面
│   ├── stores/               # 状态管理
│   │   ├── authStore.js      # 认证状态
│   │   └── cartStore.js      # 购物车状态
│   ├── services/             # API服务
│   │   ├── api.js            # Axios配置
│   │   ├── authService.js    # 认证服务
│   │   ├── productService.js # 商品服务
│   │   ├── memberService.js  # 会员服务
│   │   └── ...               # 其他服务
│   └── styles/               # 全局样式
├── server/                   # 后端API服务
│   ├── src/
│   │   ├── config/           # 配置文件
│   │   │   └── database.js   # 数据库配置
│   │   ├── routes/           # API路由
│   │   │   ├── auth.js       # 认证路由
│   │   │   ├── products.js   # 商品路由
│   │   │   ├── members.js    # 会员路由
│   │   │   ├── transactions.js # 交易路由
│   │   │   └── ...           # 其他路由
│   │   └── index.js          # 服务入口
│   ├── database/             # 数据库脚本
│   │   └── pos_system_init.sql # 初始化脚本
│   ├── .env.example          # 环境变量示例
│   └── package.json          # 后端依赖
└── package.json              # 前端依赖
```

---

## 快速开始

### 前置要求

- Node.js >= 16.0.0
- MySQL >= 5.7
- npm 或 cnpm

### 安装步骤

#### 1. 克隆项目

```bash
git clone https://github.com/sheepfishzhuo/pos-shop.git
cd pos-shop
```

#### 2. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd server
npm install
cd ..
```

#### 3. 初始化数据库

```bash
# 登录MySQL并执行初始化脚本
mysql -u root -p < server/database/pos_system_init.sql
```

或者在MySQL客户端中执行：
```sql
source /path/to/pos-shop/server/database/pos_system_init.sql
```

#### 4. 配置环境变量

创建 `server/.env` 文件：

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=pos_system
JWT_SECRET=your_jwt_secret_key
```

#### 5. 启动服务

```bash
# 启动后端服务 (终端1)
cd server
npm run dev

# 启动前端开发服务器 (终端2)
npm run dev

# 启动Electron桌面应用 (终端3)
npm run electron:dev
```

---

## 默认账户

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |

---

## 开发命令

```bash
# 前端开发
npm run dev              # 启动Vite开发服务器
npm run build            # 构建生产版本
npm run preview          # 预览生产版本

# Electron
npm run electron:dev     # 启动Electron开发模式
npm run electron:build   # 构建Electron应用

# 后端开发
cd server
npm run dev              # 启动后端服务 (带热重载)
npm start                # 启动后端服务
```

---

## API接口

### 认证模块
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/users | 获取用户列表 |
| POST | /api/auth/register | 用户注册 |
| PUT | /api/auth/users/:id | 更新用户 |
| DELETE | /api/auth/users/:id | 删除用户 |

### 商品模块
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/products | 获取商品列表 |
| GET | /api/products/hot/list | 获取热门商品 |
| GET | /api/products/:id | 获取商品详情 |
| POST | /api/products | 添加商品 |
| PUT | /api/products/:id | 更新商品 |
| PUT | /api/products/:id/hot | 设置热门商品 |
| DELETE | /api/products/:id | 删除商品 |

### 交易模块
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/transactions | 获取交易列表 |
| GET | /api/transactions/:id | 获取交易详情 |
| POST | /api/transactions | 创建交易 |
| POST | /api/transactions/:id/refund | 退款 |

### 会员模块
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/members | 获取会员列表 |
| GET | /api/members/:id | 获取会员详情 |
| POST | /api/members | 添加会员 |
| PUT | /api/members/:id | 更新会员 |
| POST | /api/members/:id/recharge | 会员充值 |
| POST | /api/members/:id/points | 调整积分 |

### 促销模块
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/promotions | 获取促销列表 |
| GET | /api/promotions/active | 获取有效促销 |
| POST | /api/promotions | 创建促销活动 |
| POST | /api/coupons/verify | 验证优惠券 |

### 报表模块
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/reports/daily | 日报表 |
| GET | /api/reports/category | 分类报表 |
| GET | /api/reports/top-products | 热销商品 |

---

## 数据库表结构

| 表名 | 说明 |
|------|------|
| users | 用户表 |
| permissions | 权限表 |
| role_permissions | 角色权限关联表 |
| categories | 商品分类表 |
| products | 商品表 |
| members | 会员表 |
| member_points_log | 会员积分记录表 |
| member_balance_log | 会员余额记录表 |
| member_recharge_log | 会员充值记录表 |
| transactions | 交易记录表 |
| refunds | 退款记录表 |
| inventory_logs | 库存变动记录表 |
| promotions | 促销活动表 |
| promotion_full_reductions | 满减活动表 |
| promotion_specials | 特价商品表 |
| promotion_combos | 组合套餐表 |
| coupons | 优惠券表 |
| point_products | 积分商品表 |
| point_exchanges | 积分兑换记录表 |
| shift_records | 交接班记录表 |
| operation_logs | 操作日志表 |

---

## 功能展示

### 收银台
- 商品搜索和扫码
- 热门商品快捷选择
- 购物车管理
- 打折优惠
- 优惠券核销
- 会员选择与积分
- 多种支付方式（现金、银行卡、微信、支付宝、会员余额）

### 商品管理
- 商品列表与搜索
- 分类筛选
- 条码管理
- 成本与利润管理
- 热门商品设置
- 库存预警

### 会员管理
- 会员信息管理
- 会员等级（普通、银卡、金卡、白金）
- 积分累计与兑换
- 余额充值与消费

### 促销活动
- 满减活动（如满100减10）
- 特价商品
- 组合套餐
- 优惠券管理

---

## 许可证

[MIT License](LICENSE)

---

## 贡献

欢迎提交 Issue 和 Pull Request！

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/sheepfishzhuo">sheepfishzhuo</a>
</p>
