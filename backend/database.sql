-- NogaHub Database Schema
-- Run this script to set up the database manually (optional - Sequelize will auto-create)

CREATE DATABASE IF NOT EXISTS nogahub_db;
USE nogahub_db;

-- Users table
CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Equipment table
CREATE TABLE IF NOT EXISTS Equipment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    dealerUSD DECIMAL(10, 2) NOT NULL,
    clientUSD DECIMAL(10, 2) NOT NULL,
    weight DECIMAL(8, 2) NOT NULL,
    category VARCHAR(255) NOT NULL,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS Projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    projectName VARCHAR(255) NOT NULL,
    clientName VARCHAR(255) NOT NULL,
    userId INT NOT NULL,
    equipment JSON NOT NULL,
    globalDiscount DECIMAL(5, 2) DEFAULT 0,
    services JSON NOT NULL,
    customServices JSON,
    customEquipment JSON,
    roles JSON NOT NULL,
    total DECIMAL(12, 2) DEFAULT 0,
    isCalculated BOOLEAN DEFAULT FALSE,
    calculationResults JSON,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_username ON Users(username);
CREATE INDEX idx_equipment_code ON Equipment(code);
CREATE INDEX idx_equipment_category ON Equipment(category);
CREATE INDEX idx_projects_userId ON Projects(userId);
CREATE INDEX idx_projects_clientName ON Projects(clientName);

-- Create default admin user (password: admin123)
INSERT INTO Users (username, email, password, role) VALUES 
('admin', 'admin@nogahub.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewVyLzmB2sfHXgKm', 'admin')
ON DUPLICATE KEY UPDATE id=id;

-- Insert equipment data
INSERT INTO Equipment (code, name, dealerUSD, clientUSD, weight, category) VALUES
('IT1000', 'Cyclone 4', 181.91, 330.75, 1.3, 'void'),
('IT1001', 'Cirrus 6.1', 129.94, 236.25, 3.5, 'void'),
('IT1002', 'Indigo 6s', 511.85, 930.15, 5.2, 'void'),
('IT1003', 'Indigo Sub', 1013.51, 1842.75, 21, 'void'),
('IT1004', 'Air Vantage', 3441.49, 6257.25, 23.5, 'void'),
('IT1005', 'Airten V3', 2189.63, 3981.15, 20, 'void'),
('IT1006', 'Air 8', 816.01, 1483.65, 6.2, 'void'),
('IT1007', 'Venu 112', 593.26, 1078.65, 27, 'void'),
('IT1008', 'Venu 12', 575.44, 1046.25, 22, 'void'),
('IT1009', 'Venu 208', 504, 916.65, 20, 'void'),
('IT1010', 'Venu 212', 927.38, 1686.15, 47.5, 'void'),
('IT1011', 'Cyclone 8', 667.51, 1213.65, 14, 'void'),
('IT1012', 'Cyclone 55', 412.09, 749.25, 3.2, 'void'),
('IT1013', 'Cyclone 10', 835.31, 1518.75, 14.5, 'void'),
('IT1014', 'Cyclone Bass', 1216.96, 2212.65, 33.5, 'void'),
('IT1015', 'Bias Q1.5+', 1951.78, 3049.65, 7, 'void'),
('IT1016', 'Inca 500', 910.72, 1423, 2.8, 'void'),
('IT1017', 'Bias Q1+', 1614.82, 2523.15, 7, 'void'),
('IT1018', 'Bias Q2+', 2573.86, 4021.65, 7, 'void'),
('IT1019', 'Bias Q3+', 3481.06, 5439.15, 11.5, 'void'),
('IT1020', 'Bias D1', 1467.94, 2293.65, 7, 'void'),
('IT1021', 'Van Damm Cables 2 x 4mm', 7.05, 12.83, 0.25, 'void'),
('IT1022', 'Van Damm Cables 2 x 2.5mm', 4.08, 7.43, 0.25, 'void'),
('IT1023', 'Van Damm Cables 4 x 4mm', 9.28, 16.88, 0.25, 'void'),
('IT1024', 'Van Damm Cables 4 x 2.5mm', 5.57, 10.13, 0.25, 'void'),
('IT1025', 'WM Touch Screen', 316.22, 494.1, 1, 'void'),
('AC1006', 'CAT 6 Cables', 0.7, 1, 0.1, 'accessory'),
('AC1007', 'NetGear Switch', 550, 650, 0.1, 'accessory'),
('AC1008', 'Italy Power Cables 2x 4mm', 2.8, 4.5, 0.25, 'accessory'),
('AC1009', 'Italy Power Cables 2x 2.5mm', 1.6, 2.8, 0.25, 'accessory'),
('AC1010', 'AHM 16', 1500, 1500, 3.8, 'accessory'),
('AC1011', 'Scarlet 2i2', 300, 375, 0.5, 'accessory')
ON DUPLICATE KEY UPDATE id=id;