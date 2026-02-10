
-- 1. 创建数据库
CREATE DATABASE IF NOT EXISTS ims_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ims_db;

-- 2. 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Staff') DEFAULT 'Staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 产品与交易表 (支持最高 15 位小数)
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    purchase_price DECIMAL(36, 15) NOT NULL DEFAULT 0, -- 高精度单价，支持15位小数
    purchase_quantity DECIMAL(15, 4) NOT NULL DEFAULT 1, -- 支持非整数数量
    purchase_tax_amount DECIMAL(8, 4) NOT NULL DEFAULT 0, -- 税点百分比精度
    selling_price DECIMAL(36, 15) NOT NULL DEFAULT 0, -- 高精度单价，支持15位小数
    sales_quantity DECIMAL(15, 4) NOT NULL DEFAULT 1,
    sales_tax_amount DECIMAL(8, 4) NOT NULL DEFAULT 0,
    purchase_channel VARCHAR(255),
    customer_name VARCHAR(255),
    purchase_invoiced BOOLEAN DEFAULT FALSE,
    purchase_invoice_date DATE,
    shipped BOOLEAN DEFAULT FALSE,
    shipped_date DATE,
    sales_invoiced BOOLEAN DEFAULT FALSE,
    sales_invoice_date DATE,
    paid BOOLEAN DEFAULT FALSE,
    payment_date DATE,
    purchase_contract_id VARCHAR(100),
    sales_contract_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 文件关联表
CREATE TABLE IF NOT EXISTS product_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 5. 插入演示账号
INSERT IGNORE INTO users (username, password, role) VALUES ('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin');
