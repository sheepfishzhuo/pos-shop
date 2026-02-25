/*
 ============================================
   智慧收银系统 - 数据库初始化脚本
   Smart POS System - Database Init Script
 ============================================
 
 使用说明：
 1. 确保 MySQL 5.7+ 或 MySQL 8.0+ 已安装
 2. 执行此脚本创建数据库和表结构
 3. 默认管理员账号: admin / admin123
 
 执行方式：
 mysql -u root -p < pos_system_init.sql
 
 或在 MySQL 客户端中执行：
 source /path/to/pos_system_init.sql
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- 创建数据库
-- ----------------------------
CREATE DATABASE IF NOT EXISTS `pos_system` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `pos_system`;

-- ----------------------------
-- 表结构：用户表
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(36) PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `role` ENUM('admin', 'manager', 'cashier') DEFAULT 'cashier',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ----------------------------
-- 表结构：权限表
-- ----------------------------
DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- ----------------------------
-- 表结构：角色权限关联表
-- ----------------------------
DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `role` VARCHAR(50) NOT NULL,
  `permission_id` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_role_permission` (`role`, `permission_id`),
  INDEX `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- ----------------------------
-- 表结构：商品分类表
-- ----------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品分类表';

-- ----------------------------
-- 表结构：商品表
-- ----------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `barcode` VARCHAR(50) UNIQUE,
  `category_id` VARCHAR(36),
  `price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `cost` DECIMAL(10, 2) DEFAULT 0,
  `stock` INT DEFAULT 0,
  `min_stock` INT DEFAULT 10 COMMENT '最低库存预警',
  `unit` VARCHAR(20) DEFAULT '个',
  `supplier` VARCHAR(100) COMMENT '供应商',
  `image_url` VARCHAR(255),
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `is_hot` TINYINT(1) DEFAULT 0 COMMENT '是否热门商品',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_name` (`name`),
  INDEX `idx_barcode` (`barcode`),
  INDEX `idx_category` (`category_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品表';

-- ----------------------------
-- 表结构：会员表
-- ----------------------------
DROP TABLE IF EXISTS `members`;
CREATE TABLE `members` (
  `id` VARCHAR(36) PRIMARY KEY,
  `member_no` VARCHAR(50) UNIQUE NOT NULL COMMENT '会员编号',
  `name` VARCHAR(100) NOT NULL COMMENT '会员姓名',
  `phone` VARCHAR(20) UNIQUE NOT NULL COMMENT '手机号',
  `email` VARCHAR(100) COMMENT '邮箱',
  `gender` ENUM('male', 'female', 'other') DEFAULT 'male' COMMENT '性别',
  `birthday` DATE COMMENT '生日',
  `points` INT DEFAULT 0 COMMENT '积分',
  `level` ENUM('normal', 'silver', 'gold', 'platinum') DEFAULT 'normal' COMMENT '会员等级',
  `total_spent` DECIMAL(10, 2) DEFAULT 0 COMMENT '累计消费金额',
  `balance` DECIMAL(10, 2) DEFAULT 0 COMMENT '账户余额',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_member_no` (`member_no`),
  INDEX `idx_phone` (`phone`),
  INDEX `idx_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员信息表';

-- ----------------------------
-- 表结构：交易记录表
-- ----------------------------
DROP TABLE IF EXISTS `transactions`;
CREATE TABLE `transactions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `cashier_id` VARCHAR(36) NOT NULL,
  `cashier_name` VARCHAR(100),
  `member_id` VARCHAR(36) COMMENT '会员ID',
  `items` JSON NOT NULL,
  `subtotal` DECIMAL(10, 2) DEFAULT 0,
  `discount` DECIMAL(10, 2) DEFAULT 0,
  `discount_type` ENUM('percent', 'fixed') DEFAULT 'percent',
  `promotion_discount` DECIMAL(10, 2) DEFAULT 0,
  `coupon_discount` DECIMAL(10, 2) DEFAULT 0,
  `total` DECIMAL(10, 2) NOT NULL,
  `payment_method` ENUM('cash', 'card', 'wechat', 'alipay', 'member_balance') NOT NULL,
  `status` ENUM('completed', 'cancelled', 'refunded', 'partial_refund') DEFAULT 'completed',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_cashier` (`cashier_id`),
  INDEX `idx_member` (`member_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易记录表';

-- ----------------------------
-- 表结构：退款记录表
-- ----------------------------
DROP TABLE IF EXISTS `refunds`;
CREATE TABLE `refunds` (
  `id` VARCHAR(36) PRIMARY KEY,
  `transaction_id` VARCHAR(36) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `items` JSON NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_transaction` (`transaction_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退款记录表';

-- ----------------------------
-- 表结构：库存变动记录表
-- ----------------------------
DROP TABLE IF EXISTS `inventory_logs`;
CREATE TABLE `inventory_logs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `product_id` VARCHAR(36) NOT NULL,
  `type` ENUM('in', 'out', 'adjustment') NOT NULL,
  `quantity` INT NOT NULL,
  `previous_stock` INT NOT NULL,
  `new_stock` INT NOT NULL,
  `reason` VARCHAR(255),
  `operator_id` VARCHAR(36) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_product` (`product_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存变动记录表';

-- ----------------------------
-- 表结构：会员积分记录表
-- ----------------------------
DROP TABLE IF EXISTS `member_points_log`;
CREATE TABLE `member_points_log` (
  `id` VARCHAR(36) PRIMARY KEY,
  `member_id` VARCHAR(36) NOT NULL COMMENT '会员ID',
  `type` ENUM('earn', 'redeem', 'adjust') NOT NULL COMMENT '类型',
  `points` INT NOT NULL COMMENT '积分数量',
  `balance` INT NOT NULL COMMENT '变动后余额',
  `source` VARCHAR(100) COMMENT '来源',
  `transaction_id` VARCHAR(36) COMMENT '关联交易ID',
  `operator_id` VARCHAR(36) COMMENT '操作员ID',
  `remark` TEXT COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_member_id` (`member_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员积分记录表';

-- ----------------------------
-- 表结构：会员充值记录表
-- ----------------------------
DROP TABLE IF EXISTS `member_recharge_log`;
CREATE TABLE `member_recharge_log` (
  `id` VARCHAR(36) PRIMARY KEY,
  `member_id` VARCHAR(36) NOT NULL COMMENT '会员ID',
  `amount` DECIMAL(10, 2) NOT NULL COMMENT '充值金额',
  `payment_method` VARCHAR(20) NOT NULL COMMENT '支付方式',
  `operator_id` VARCHAR(36) COMMENT '操作员ID',
  `remark` TEXT COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_member_id` (`member_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员充值记录表';

-- ----------------------------
-- 表结构：会员余额变动记录表
-- ----------------------------
DROP TABLE IF EXISTS `member_balance_log`;
CREATE TABLE `member_balance_log` (
  `id` VARCHAR(36) PRIMARY KEY,
  `member_id` VARCHAR(36) NOT NULL COMMENT '会员ID',
  `type` ENUM('recharge', 'consume', 'refund', 'adjust') NOT NULL COMMENT '类型',
  `amount` DECIMAL(10, 2) NOT NULL COMMENT '变动金额',
  `balance` DECIMAL(10, 2) NOT NULL COMMENT '变动后余额',
  `source` VARCHAR(100) COMMENT '来源',
  `transaction_id` VARCHAR(36) COMMENT '关联交易ID',
  `operator_id` VARCHAR(36) COMMENT '操作员ID',
  `remark` TEXT COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_member_id` (`member_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员余额变动记录表';

-- ----------------------------
-- 表结构：促销活动表
-- ----------------------------
DROP TABLE IF EXISTS `promotions`;
CREATE TABLE `promotions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('full_reduction', 'special', 'combo', 'coupon') NOT NULL,
  `description` TEXT,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `priority` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_type` (`type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_time` (`start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='促销活动表';

-- ----------------------------
-- 表结构：满减活动表
-- ----------------------------
DROP TABLE IF EXISTS `promotion_full_reductions`;
CREATE TABLE `promotion_full_reductions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `promotion_id` VARCHAR(36) NOT NULL,
  `full_amount` DECIMAL(10, 2) NOT NULL,
  `reduction_amount` DECIMAL(10, 2) NOT NULL,
  INDEX `idx_promotion` (`promotion_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='满减活动表';

-- ----------------------------
-- 表结构：特价商品表
-- ----------------------------
DROP TABLE IF EXISTS `promotion_specials`;
CREATE TABLE `promotion_specials` (
  `id` VARCHAR(36) PRIMARY KEY,
  `promotion_id` VARCHAR(36) NOT NULL,
  `product_id` VARCHAR(36) NOT NULL,
  `original_price` DECIMAL(10, 2) NOT NULL,
  `special_price` DECIMAL(10, 2) NOT NULL,
  `limit_quantity` INT DEFAULT 0,
  INDEX `idx_promotion` (`promotion_id`),
  INDEX `idx_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='特价商品表';

-- ----------------------------
-- 表结构：组合套餐表
-- ----------------------------
DROP TABLE IF EXISTS `promotion_combos`;
CREATE TABLE `promotion_combos` (
  `id` VARCHAR(36) PRIMARY KEY,
  `promotion_id` VARCHAR(36) NOT NULL,
  `combo_name` VARCHAR(100) NOT NULL,
  `combo_price` DECIMAL(10, 2) NOT NULL,
  INDEX `idx_promotion` (`promotion_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='组合套餐表';

-- ----------------------------
-- 表结构：套餐商品关联表
-- ----------------------------
DROP TABLE IF EXISTS `promotion_combo_items`;
CREATE TABLE `promotion_combo_items` (
  `id` VARCHAR(36) PRIMARY KEY,
  `combo_id` VARCHAR(36) NOT NULL,
  `product_id` VARCHAR(36) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  INDEX `idx_combo` (`combo_id`),
  INDEX `idx_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐商品关联表';

-- ----------------------------
-- 表结构：优惠券表
-- ----------------------------
DROP TABLE IF EXISTS `coupons`;
CREATE TABLE `coupons` (
  `id` VARCHAR(36) PRIMARY KEY,
  `promotion_id` VARCHAR(36),
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('fixed', 'percent') NOT NULL,
  `value` DECIMAL(10, 2) NOT NULL,
  `min_amount` DECIMAL(10, 2) DEFAULT 0,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `status` ENUM('active', 'used', 'expired', 'inactive') DEFAULT 'active',
  `used_at` DATETIME,
  `used_by` VARCHAR(36),
  `transaction_id` VARCHAR(36),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_code` (`code`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='优惠券表';

-- ----------------------------
-- 表结构：积分商品表
-- ----------------------------
DROP TABLE IF EXISTS `point_products`;
CREATE TABLE `point_products` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `image_url` VARCHAR(255),
  `points_required` INT NOT NULL,
  `stock` INT DEFAULT 0,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分商品表';

-- ----------------------------
-- 表结构：积分兑换记录表
-- ----------------------------
DROP TABLE IF EXISTS `point_exchanges`;
CREATE TABLE `point_exchanges` (
  `id` VARCHAR(36) PRIMARY KEY,
  `member_id` VARCHAR(36) NOT NULL,
  `point_product_id` VARCHAR(36),
  `points_used` INT NOT NULL,
  `quantity` INT DEFAULT 1,
  `status` ENUM('completed', 'cancelled') DEFAULT 'completed',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_member` (`member_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分兑换记录表';

-- ----------------------------
-- 表结构：交接班记录表
-- ----------------------------
DROP TABLE IF EXISTS `shift_records`;
CREATE TABLE `shift_records` (
  `id` VARCHAR(36) PRIMARY KEY,
  `cashier_id` VARCHAR(36) NOT NULL,
  `cashier_name` VARCHAR(100) NOT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME,
  `start_cash` DECIMAL(10, 2) DEFAULT 0,
  `end_cash` DECIMAL(10, 2) DEFAULT 0,
  `total_sales` DECIMAL(10, 2) DEFAULT 0,
  `cash_sales` DECIMAL(10, 2) DEFAULT 0,
  `card_sales` DECIMAL(10, 2) DEFAULT 0,
  `wechat_sales` DECIMAL(10, 2) DEFAULT 0,
  `alipay_sales` DECIMAL(10, 2) DEFAULT 0,
  `member_balance_sales` DECIMAL(10, 2) DEFAULT 0,
  `transaction_count` INT DEFAULT 0,
  `refund_count` INT DEFAULT 0,
  `refund_amount` DECIMAL(10, 2) DEFAULT 0,
  `notes` TEXT,
  `status` ENUM('active', 'completed') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_cashier` (`cashier_id`),
  INDEX `idx_start_time` (`start_time`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交接班记录表';

-- ----------------------------
-- 表结构：操作日志表
-- ----------------------------
DROP TABLE IF EXISTS `operation_logs`;
CREATE TABLE `operation_logs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(36),
  `user_name` VARCHAR(100),
  `action` VARCHAR(50) NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `description` TEXT,
  `ip_address` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user` (`user_id`),
  INDEX `idx_action` (`action`),
  INDEX `idx_module` (`module`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- ============================================
-- 初始数据
-- ============================================

-- ----------------------------
-- 初始权限数据
-- ----------------------------
INSERT INTO `permissions` (`id`, `code`, `name`, `description`) VALUES
(UUID(), 'cashier', '收银台', '收银台访问权限'),
(UUID(), 'products', '商品管理', '商品列表、添加、编辑权限'),
(UUID(), 'categories', '分类管理', '分类管理权限'),
(UUID(), 'inventory', '库存管理', '库存查看和调整权限'),
(UUID(), 'members', '会员管理', '会员管理权限'),
(UUID(), 'transactions', '交易记录', '交易记录查看权限'),
(UUID(), 'reports', '报表统计', '报表查看权限'),
(UUID(), 'users', '用户管理', '用户管理权限'),
(UUID(), 'shift', '交接班', '交接班功能权限'),
(UUID(), 'logs', '操作日志', '操作日志查看权限'),
(UUID(), 'settings', '系统设置', '系统设置权限'),
(UUID(), 'discount', '打折权限', '收银时打折权限'),
(UUID(), 'refund', '退款权限', '退款操作权限'),
(UUID(), 'cost_view', '查看成本', '查看商品成本价权限'),
(UUID(), 'promotions', '促销管理', '促销活动管理权限');

-- ----------------------------
-- 角色权限分配
-- ----------------------------
-- 管理员拥有所有权限
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`)
SELECT UUID(), 'admin', id FROM `permissions`;

-- 经理权限
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`)
SELECT UUID(), 'manager', id FROM `permissions` WHERE `code` IN 
('cashier', 'products', 'categories', 'inventory', 'members', 'transactions', 'reports', 'shift', 'logs', 'discount', 'refund', 'cost_view', 'promotions');

-- 收银员权限
INSERT INTO `role_permissions` (`id`, `role`, `permission_id`)
SELECT UUID(), 'cashier', id FROM `permissions` WHERE `code` IN 
('cashier', 'transactions', 'shift');

-- ----------------------------
-- 初始管理员账号
-- 密码: admin123 (bcrypt加密)
-- ----------------------------
INSERT INTO `users` (`id`, `username`, `password`, `name`, `role`) VALUES
(UUID(), 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.QGhT5FpKlWJWq9YK8u', '系统管理员', 'admin');

-- ----------------------------
-- 示例商品分类
-- ----------------------------
INSERT INTO `categories` (`id`, `name`, `description`) VALUES
(UUID(), '饮料', '各类饮品'),
(UUID(), '食品', '方便食品、零食等'),
(UUID(), '日用品', '日常生活用品'),
(UUID(), '文具', '办公用品、学习用品'),
(UUID(), '配品', '购物袋等'),
(UUID(), '其他', '其他商品');

-- ----------------------------
-- 示例商品数据
-- ----------------------------
INSERT INTO `products` (`id`, `name`, `barcode`, `category_id`, `price`, `cost`, `stock`, `unit`, `status`) VALUES
(UUID(), '可口可乐 500ml', '6901234567890', (SELECT id FROM categories WHERE name = '饮料' LIMIT 1), 3.50, 2.00, 100, '瓶', 'active'),
(UUID(), '农夫山泉 550ml', '6901234567891', (SELECT id FROM categories WHERE name = '饮料' LIMIT 1), 2.00, 1.20, 150, '瓶', 'active'),
(UUID(), '康师傅红烧牛肉面', '6901234567892', (SELECT id FROM categories WHERE name = '食品' LIMIT 1), 4.50, 3.00, 80, '袋', 'active'),
(UUID(), '乐事薯片原味', '6901234567893', (SELECT id FROM categories WHERE name = '食品' LIMIT 1), 8.00, 5.50, 50, '袋', 'active'),
(UUID(), '心相印抽纸', '6901234567894', (SELECT id FROM categories WHERE name = '日用品' LIMIT 1), 6.50, 4.00, 60, '包', 'active'),
(UUID(), '晨光中性笔', '6901234567895', (SELECT id FROM categories WHERE name = '文具' LIMIT 1), 2.00, 1.00, 200, '支', 'active'),
(UUID(), '购物袋 大号', '6901234567896', (SELECT id FROM categories WHERE name = '配品' LIMIT 1), 0.50, 0.20, 500, '个', 'active'),
(UUID(), '购物袋 小号', '6901234567897', (SELECT id FROM categories WHERE name = '配品' LIMIT 1), 0.30, 0.10, 500, '个', 'active');

-- ----------------------------
-- 示例会员数据
-- ----------------------------
INSERT INTO `members` (`id`, `member_no`, `name`, `phone`, `email`, `gender`, `birthday`, `points`, `level`, `total_spent`, `balance`, `status`) VALUES
(UUID(), 'M20240001', '张三', '13800138001', 'zhangsan@example.com', 'male', '1990-05-15', 1000, 'gold', 5000.00, 500.00, 'active'),
(UUID(), 'M20240002', '李四', '13800138002', 'lisi@example.com', 'female', '1985-08-20', 500, 'silver', 2000.00, 200.00, 'active'),
(UUID(), 'M20240003', '王五', '13800138003', NULL, 'male', '1995-03-10', 100, 'normal', 500.00, 0.00, 'active');

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 初始化完成
-- ============================================
-- 
-- 默认登录信息：
-- 用户名: admin
-- 密码: admin123
--
-- ============================================
