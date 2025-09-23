-- Create database (run this first in your PostgreSQL admin tool)
CREATE DATABASE household_supplies;

-- Connect to the database, then run these:

-- Users table for admin authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table for household supplies
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(255),
    stock_quantity INTEGER DEFAULT 0,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample admin user (password: admin123)
INSERT INTO users (username, password_hash) VALUES (
    'admin', 
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' -- bcrypt hash for 'admin123'
);

-- Insert sample household supplies products
INSERT INTO products (name, description, price, image_url, stock_quantity, category) VALUES
('All-Purpose Cleaner', 'Effective cleaner for all surfaces', 5.99, '/images/cleaner.jpg', 50, 'Cleaning'),
('Laundry Detergent', 'Concentrated liquid detergent', 8.99, '/images/detergent.jpg', 30, 'Laundry'),
('Dish Soap', 'Gentle on hands, tough on grease', 3.49, '/images/dish-soap.jpg', 100, 'Kitchen'),
('Paper Towels', 'Absorbent 2-ply paper towels', 4.99, '/images/paper-towels.jpg', 25, 'Paper Goods'),
('Trash Bags', 'Strong 13-gallon trash bags', 6.49, '/images/trash-bags.jpg', 40, 'Waste Management');