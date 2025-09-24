# Household Supplies E-Commerce API

A complete Node.js backend API for a household supplies e-commerce platform.

## Features

### ✅ Completed Backend Features
- **Product Management** (CRUD operations)
- **User Authentication** (Admin + Customer roles)
- **Shopping Cart** (Add, update, remove items)
- **Order Management** (Create, view, cancel orders)
- **Role-Based Access Control**
- **Caching System** for performance
- **PostgreSQL Database** integration

## API Endpoints

### Authentication
- `POST /api/auth/register` - Customer registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Products (Public)
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product

### Products (Admin Protected)
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Shopping Cart (Customer Protected)
- `GET /api/cart` - Get cart items
- `POST /api/cart/add` - Add to cart
- `PUT /api/cart/update/:id` - Update cart item
- `DELETE /api/cart/remove/:id` - Remove from cart
- `DELETE /api/cart/clear` - Clear cart

### Orders (Customer Protected)
- `GET /api/orders` - Get customer orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders/create` - Create order from cart
- `PUT /api/orders/:id/cancel` - Cancel order

## Technology Stack

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **Authentication:** Custom token-based with role management
- **Caching:** Node-cache for performance optimization

## Installation

```bash
# Clone repository
git clone https://github.com/your-username/household-supplies-ecommerce.git

# Install dependencies
cd backend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Start server
npm run dev
