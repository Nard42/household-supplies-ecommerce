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
CREATE TABLE users_backup AS SELECT * FROM users;

-- Verify the backup:  Check that the data is correctly copied.
SELECT * FROM users_backup;  -- Make sure the data looks right!


-- Drop the existing 'users' table (This will DELETE all data in the table)
DROP TABLE IF EXISTS users;

-- Create the new 'users' table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'customer',  -- 'customer' or 'admin'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Insert a sample customer (Remember to replace with a real hashed password!)
INSERT INTO users (email, password, first_name, last_name, role)
VALUES ('customer@example.com', '1234', 'John', 'Doe', 'customer');

-- Insert a sample admin (Remember to replace with a real hashed password!)
INSERT INTO users (email, password, first_name, last_name, role)
VALUES ('admin@example.com', '4321', 'Admin', 'User', 'admin');


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


-- Insert sample household supplies products
INSERT INTO products (name, description, price, image_url, stock_quantity, category) VALUES
('All-Purpose Cleaner', 'Effective cleaner for all surfaces', 5.99, '/images/cleaner.jpg', 50, 'Cleaning'),
('Laundry Detergent', 'Concentrated liquid detergent', 8.99, '/images/detergent.jpg', 30, 'Laundry'),
('Dish Soap', 'Gentle on hands, tough on grease', 3.49, '/images/dish-soap.jpg', 100, 'Kitchen'),
('Paper Towels', 'Absorbent 2-ply paper towels', 4.99, '/images/paper-towels.jpg', 25, 'Paper Goods'),
('Trash Bags', 'Strong 13-gallon trash bags', 6.49, '/images/trash-bags.jpg', 40, 'Waste Management');


-- Create orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, shipped, delivered, cancelled
    shipping_address TEXT,
    payment_method VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL, -- price at time of order
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create cart_items table for temporary cart storage
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id) -- Prevent duplicate cart items
);



SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
SELECT * FROM products;
SELECT * FROM users;