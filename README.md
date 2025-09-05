# Tailoring E-commerce Application

A full-stack e-commerce application specialized for tailoring services, similar to Amazon but focused on custom clothing and fabric sales.

## Features

### Frontend
- User authentication (login, register, forgot password)
- Product browsing by categories (Men's wear, Women's wear, Kid's wear, Electronics)
- Tailoring-specific features with custom measurements
- Shopping cart functionality
- Order placement with multiple payment options
- User profile and order history
- Responsive design with modern UI/UX

### Backend
- RESTful API with Express.js
- MongoDB database with Mongoose ODM
- JWT-based authentication
- Password hashing with bcrypt
- Email functionality for password reset
- Order management system
- Cart management
- Product catalog management

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Email**: Nodemailer

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/tailoring_shop
   JWT_SECRET=your-super-secret-jwt-key
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   PORT=5000
   ```

4. Make sure MongoDB is running on your system

5. Start the server:
   ```bash
   npm start
   ```

6. Open your browser and navigate to `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Products
- `GET /api/products` - Get all products (with optional filters)
- `GET /api/products/:id` - Get single product

### Cart
- `POST /api/cart/add` - Add product to cart
- `GET /api/cart` - Get user's cart

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders

### User
- `GET /api/user/profile` - Get user profile

## Key Features

### Tailoring Measurements
The application includes a comprehensive measurement system with 14 different body measurements:
1. Chest
2. Waist
3. Shoulder
4. Arm Length
5. Neck Size
6. Bicep
7. Wrist
8. Shirt Length
9. Pant Waist
10. Pant Length
11. Thigh
12. Knee
13. Ankle
14. Rise

### Payment Options
- Cash on Delivery
- Credit/Debit Card
- UPI Apps

### Order Management
- Order tracking
- Order history
- Custom measurements storage
- Delivery address management

## Database Schema

### User
- Personal information (name, email, phone)
- Address details (state, district, mandal, pincode)
- Authentication credentials

### Product
- Product details (name, description, price)
- Category and subcategory
- Stock status and delivery information

### Order
- User reference
- Product details with custom measurements
- Delivery address
- Payment method and total amount
- Order status and date

### Cart
- User reference
- Product list with quantities

## Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Protected routes requiring authentication
- Input validation and sanitization
- CORS enabled for cross-origin requests

## Usage

1. **Registration**: New users can register with comprehensive personal and address information
2. **Login**: Existing users can log in with username and password
3. **Browse Products**: Users can browse products by categories and search
4. **Tailoring**: For tailoring products, users can provide custom measurements
5. **Cart**: Add products to cart and manage quantities
6. **Checkout**: Complete orders with delivery address and payment method selection
7. **Order Tracking**: View order history and track current orders

## Development

The application is structured with:
- Frontend files in the `frontend/` directory
- Backend server in `server.js`
- Authentication utilities in `frontend/js/auth.js`
- API service utilities in `frontend/js/api.js`

## Future Enhancements

- Image upload for products
- Real-time order tracking
- Payment gateway integration
- Admin panel for product management
- Email notifications for orders
- Mobile app development
- Advanced search and filtering
- Product reviews and ratings