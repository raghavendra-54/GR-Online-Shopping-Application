const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tailoring_shop', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  state: { type: String, required: true },
  district: { type: String, required: true },
  mandal: { type: String, required: true },
  pincode: { type: String, required: true },
  address1: { type: String, required: true },
  address2: { type: String, required: true },
  phone: { type: String, required: true },
  alternatePhone: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  subcategory: { type: String, required: true },
  image: { type: String, required: true },
  inStock: { type: Boolean, default: true },
  discount: { type: Number, default: 0 },
  deliveryDays: { type: String, default: '4-5 DAYS' },
  deliveryCharge: { type: Number, default: 3 }
});

// Order Schema
const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1 },
    measurements: {
      chest: String,
      waist: String,
      shoulder: String,
      armLength: String,
      neckSize: String,
      bicep: String,
      wrist: String,
      shirtLength: String,
      pantWaist: String,
      pantLength: String,
      thigh: String,
      knee: String,
      ankle: String,
      rise: String
    }
  }],
  deliveryAddress: {
    name: String,
    phone: String,
    pincode: String,
    address: String
  },
  paymentMethod: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'Placed' },
  orderDate: { type: Date, default: Date.now }
});

// Cart Schema
const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1 },
    addedAt: { type: Date, default: Date.now }
  }]
});

// Password Reset Schema
const passwordResetSchema = new mongoose.Schema({
  email: { type: String, required: true },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 3600 } // 1 hour expiry
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);
const Cart = mongoose.model('Cart', cartSchema);
const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

// Email transporter
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, ...otherFields } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      ...otherFields
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ 
      message: 'Login successful', 
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'User with this email does not exist' });
    }

    // Generate reset token
    const resetToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });

    // Save reset token to database
    await PasswordReset.findOneAndUpdate(
      { email },
      { token: resetToken },
      { upsert: true, new: true }
    );

    // Create reset link
    const resetLink = `http://localhost:${PORT}/reset_password.html?token=${resetToken}`;

    // Send email (in production, uncomment this)
    /*
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
      `
    });
    */

    res.json({ 
      message: 'Password reset link sent to your email',
      resetLink // For testing purposes
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const { email } = decoded;

    // Check if reset token exists
    const resetRecord = await PasswordReset.findOne({ email, token });
    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await User.findOneAndUpdate({ email }, { password: hashedPassword });

    // Delete reset token
    await PasswordReset.deleteOne({ email, token });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Invalid or expired token' });
  }
});

// Get Products
app.get('/api/products', async (req, res) => {
  try {
    const { category, subcategory, search } = req.query;
    let query = {};

    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query);
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Single Product
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add to Cart
app.post('/api/cart/add', authenticateToken, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user.userId;

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, products: [] });
    }

    const existingProduct = cart.products.find(p => p.productId.toString() === productId);
    if (existingProduct) {
      existingProduct.quantity += quantity;
    } else {
      cart.products.push({ productId, quantity });
    }

    await cart.save();
    res.json({ message: 'Product added to cart' });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Cart
app.get('/api/cart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const cart = await Cart.findOne({ userId }).populate('products.productId');
    res.json(cart || { products: [] });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create Order
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { products, deliveryAddress, paymentMethod, totalAmount } = req.body;
    const userId = req.user.userId;

    const order = new Order({
      userId,
      products,
      deliveryAddress,
      paymentMethod,
      totalAmount
    });

    await order.save();

    // Clear cart after order
    await Cart.findOneAndUpdate({ userId }, { products: [] });

    res.status(201).json({ message: 'Order placed successfully', orderId: order._id });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get User Orders
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const orders = await Order.find({ userId }).populate('products.productId').sort({ orderDate: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get User Profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Seed initial products
const seedProducts = async () => {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      const products = [
        {
          name: "N-Checkered cotton fabric purple",
          description: "High quality checkered cotton fabric in purple color. Perfect for tailoring custom shirts.",
          price: 350,
          category: "men's wear",
          subcategory: "tailoring",
          image: "/images/fabric1.jpg",
          discount: 12
        },
        {
          name: "SMENS - silera camel color fabric piece",
          description: "Premium silera fabric in camel color. Ideal for formal wear tailoring.",
          price: 250,
          category: "men's wear",
          subcategory: "tailoring",
          image: "/images/fabric2.jpg"
        },
        {
          name: "M-cotton Reddit color, black&blue check",
          description: "Cotton fabric with black and blue checkered pattern. Great for casual shirts.",
          price: 300,
          category: "men's wear",
          subcategory: "tailoring",
          image: "/images/fabric3.jpg"
        },
        {
          name: "Checks cotton regular fit men's casual shirt piece",
          description: "Ready-to-tailor cotton fabric for casual shirts in black color.",
          price: 400,
          category: "men's wear",
          subcategory: "tailoring",
          image: "/images/fabric4.jpg"
        },
        {
          name: "Mensome B-Grey check Formal cotton",
          description: "Formal grey checkered cotton fabric for professional attire.",
          price: 250,
          category: "men's wear",
          subcategory: "tailoring",
          image: "/images/fabric5.jpg"
        },
        {
          name: "M-Blue square Formal premium Giza cotton",
          description: "Premium Giza cotton with blue square pattern for formal wear.",
          price: 200,
          category: "men's wear",
          subcategory: "tailoring",
          image: "/images/fabric6.jpg"
        }
      ];

      await Product.insertMany(products);
      console.log('Sample products seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding products:', error);
  }
};

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  seedProducts();
});