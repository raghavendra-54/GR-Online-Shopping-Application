const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('frontend'));

// MongoDB Connection with better error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tailoring_shop', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Enhanced User Schema
const userSchema = new mongoose.Schema({
  firstname: { type: String, required: true, trim: true },
  lastname: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  state: { type: String, required: true, trim: true },
  district: { type: String, required: true, trim: true },
  mandal: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
  address1: { type: String, required: true, trim: true },
  address2: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  alternatePhone: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Enhanced Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, trim: true, lowercase: true },
  subcategory: { type: String, required: true, trim: true, lowercase: true },
  image: { type: String, required: true },
  images: [{ type: String }], // Multiple images
  inStock: { type: Boolean, default: true },
  stockQuantity: { type: Number, default: 100 },
  discount: { type: Number, default: 0, min: 0, max: 100 },
  deliveryDays: { type: String, default: '4-5 DAYS' },
  deliveryCharge: { type: Number, default: 3 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviews: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
    date: { type: Date, default: Date.now }
  }],
  tags: [{ type: String, trim: true }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Enhanced Order Schema
const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderNumber: { type: String, unique: true },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1, min: 1 },
    price: { type: Number, required: true }, // Price at time of order
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
    name: { type: String, required: true },
    phone: { type: String, required: true },
    pincode: { type: String, required: true },
    address: { type: String, required: true }
  },
  paymentMethod: { type: String, required: true, enum: ['Cash on Delivery', 'Credit/Debit Card', 'UPI'] },
  paymentStatus: { type: String, default: 'Pending', enum: ['Pending', 'Paid', 'Failed', 'Refunded'] },
  totalAmount: { type: Number, required: true },
  deliveryCharge: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  status: { type: String, default: 'Placed', enum: ['Placed', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] },
  trackingNumber: { type: String },
  estimatedDelivery: { type: Date },
  orderDate: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Enhanced Cart Schema
const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1, min: 1 },
    addedAt: { type: Date, default: Date.now }
  }],
  updatedAt: { type: Date, default: Date.now }
});

// Password Reset Schema
const passwordResetSchema = new mongoose.Schema({
  email: { type: String, required: true },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 3600 }
});

// Generate order number
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD${Date.now()}${String(count + 1).padStart(4, '0')}`;
  }
  next();
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
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const JWT_SECRET = process.env.JWT_SECRET;

// Validation middleware
const validateRegistration = [
  body('firstname').trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastname').trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').isMobilePhone().withMessage('Please provide a valid phone number'),
];

const validateLogin = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

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

// Error handling middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }
  next();
};

// Routes

// User Registration
app.post('/api/auth/register', validateRegistration, handleValidationErrors, async (req, res) => {
  try {
    const { username, email, password, ...otherFields } = req.body;

    const existingUser = await User.findOne({ 
      $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      ...otherFields
    });

    await user.save();
    
    // Send welcome email (optional)
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Welcome to Rudra Tailoring Shop!',
        html: `
          <h2>Welcome ${user.firstname}!</h2>
          <p>Thank you for registering with Rudra Tailoring Shop. We're excited to help you with your custom clothing needs.</p>
          <p>Start exploring our collection and place your first order today!</p>
        `
      });
    } catch (emailError) {
      console.log('Email sending failed:', emailError.message);
    }

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Login
app.post('/api/auth/login', validateLogin, handleValidationErrors, async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ 
      username: username.toLowerCase(),
      isActive: true 
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, username: user.username }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

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

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'User with this email does not exist' });
    }

    const resetToken = jwt.sign({ email: email.toLowerCase() }, JWT_SECRET, { expiresIn: '1h' });

    await PasswordReset.findOneAndUpdate(
      { email: email.toLowerCase() },
      { token: resetToken },
      { upsert: true, new: true }
    );

    const resetLink = `${req.protocol}://${req.get('host')}/reset_password.html?token=${resetToken}`;

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Request - Rudra Tailoring Shop',
        html: `
          <h2>Password Reset Request</h2>
          <p>Hello ${user.firstname},</p>
          <p>You requested a password reset for your account. Click the link below to reset your password:</p>
          <a href="${resetLink}" style="background-color: #6a11cb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      });
    } catch (emailError) {
      console.log('Email sending failed:', emailError.message);
    }

    res.json({ 
      message: 'Password reset link sent to your email',
      resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
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

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { email } = decoded;

    const resetRecord = await PasswordReset.findOne({ email, token });
    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await User.findOneAndUpdate({ email }, { password: hashedPassword, updatedAt: new Date() });
    await PasswordReset.deleteOne({ email, token });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Invalid or expired token' });
  }
});

// Get Products with enhanced filtering
app.get('/api/products', async (req, res) => {
  try {
    const { category, subcategory, search, minPrice, maxPrice, inStock, page = 1, limit = 12 } = req.query;
    let query = { isActive: true };

    if (category) query.category = category.toLowerCase();
    if (subcategory) query.subcategory = subcategory.toLowerCase();
    if (inStock === 'true') query.inStock = true;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const skip = (page - 1) * limit;
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Single Product
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('reviews.user', 'firstname lastname');
    if (!product || !product.isActive) {
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

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Product not found' });
    }

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

    cart.updatedAt = new Date();
    await cart.save();
    res.json({ message: 'Product added to cart successfully' });
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

// Update Cart Item
app.put('/api/cart/update', authenticateToken, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.userId;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const productIndex = cart.products.findIndex(p => p.productId.toString() === productId);
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found in cart' });
    }

    if (quantity <= 0) {
      cart.products.splice(productIndex, 1);
    } else {
      cart.products[productIndex].quantity = quantity;
    }

    cart.updatedAt = new Date();
    await cart.save();
    res.json({ message: 'Cart updated successfully' });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove from Cart
app.delete('/api/cart/remove/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.userId;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    cart.products = cart.products.filter(p => p.productId.toString() !== productId);
    cart.updatedAt = new Date();
    await cart.save();

    res.json({ message: 'Product removed from cart successfully' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create Order
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { products, deliveryAddress, paymentMethod, totalAmount } = req.body;
    const userId = req.user.userId;

    // Validate products and calculate total
    let calculatedTotal = 0;
    const orderProducts = [];

    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) {
        return res.status(400).json({ error: `Product ${item.productId} not found` });
      }
      
      const itemTotal = product.price * item.quantity;
      calculatedTotal += itemTotal;
      
      orderProducts.push({
        ...item,
        price: product.price
      });
    }

    // Add delivery charge
    const deliveryCharge = 3;
    calculatedTotal += deliveryCharge;

    const order = new Order({
      userId,
      products: orderProducts,
      deliveryAddress,
      paymentMethod,
      totalAmount: calculatedTotal,
      deliveryCharge,
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
    });

    await order.save();

    // Clear cart after successful order
    await Cart.findOneAndUpdate({ userId }, { products: [], updatedAt: new Date() });

    // Send order confirmation email
    try {
      const user = await User.findById(userId);
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: `Order Confirmation - ${order.orderNumber}`,
        html: `
          <h2>Order Confirmation</h2>
          <p>Dear ${user.firstname},</p>
          <p>Thank you for your order! Your order <strong>${order.orderNumber}</strong> has been placed successfully.</p>
          <p><strong>Order Details:</strong></p>
          <ul>
            ${orderProducts.map(item => `<li>${item.quantity}x Product (₹${item.price} each)</li>`).join('')}
          </ul>
          <p><strong>Total Amount:</strong> ₹${calculatedTotal}</p>
          <p><strong>Estimated Delivery:</strong> ${order.estimatedDelivery.toDateString()}</p>
          <p>We'll keep you updated on your order status.</p>
        `
      });
    } catch (emailError) {
      console.log('Order confirmation email failed:', emailError.message);
    }

    res.status(201).json({ 
      message: 'Order placed successfully', 
      orderId: order._id,
      orderNumber: order.orderNumber
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get User Orders
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (page - 1) * limit;
    const orders = await Order.find({ userId })
      .populate('products.productId')
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Order.countDocuments({ userId });

    res.json({
      orders,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Single Order
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const order = await Order.findOne({ _id: req.params.id, userId }).populate('products.productId');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
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

// Update User Profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const updates = req.body;
    
    // Remove sensitive fields
    delete updates.password;
    delete updates.username;
    delete updates.email;
    
    updates.updatedAt = new Date();
    
    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Seed initial products with better data
const seedProducts = async () => {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      const products = [
        {
          name: "Premium Checkered Cotton Fabric - Purple",
          description: "High quality checkered cotton fabric in elegant purple color. Perfect for tailoring custom formal and casual shirts. Made from 100% pure cotton with excellent breathability and comfort.",
          price: 350,
          category: "men's wear",
          subcategory: "tailoring",
          image: "https://images.pexels.com/photos/7679720/pexels-photo-7679720.jpeg?auto=compress&cs=tinysrgb&w=400",
          images: [
            "https://images.pexels.com/photos/7679720/pexels-photo-7679720.jpeg?auto=compress&cs=tinysrgb&w=400",
            "https://images.pexels.com/photos/7679721/pexels-photo-7679721.jpeg?auto=compress&cs=tinysrgb&w=400"
          ],
          discount: 12,
          stockQuantity: 50,
          tags: ["cotton", "checkered", "purple", "formal", "premium"],
          rating: 4.5
        },
        {
          name: "Silera Camel Color Fabric Piece",
          description: "Premium silera fabric in sophisticated camel color. Ideal for formal wear tailoring with excellent drape and finish. Perfect for business suits and formal shirts.",
          price: 250,
          category: "men's wear",
          subcategory: "tailoring",
          image: "https://images.pexels.com/photos/7679722/pexels-photo-7679722.jpeg?auto=compress&cs=tinysrgb&w=400",
          stockQuantity: 30,
          tags: ["silera", "camel", "formal", "business"],
          rating: 4.3
        },
        {
          name: "Cotton Reddit Color - Black & Blue Check",
          description: "Cotton fabric with stylish black and blue checkered pattern. Great for casual shirts and everyday wear. Comfortable and durable material.",
          price: 300,
          category: "men's wear",
          subcategory: "tailoring",
          image: "https://images.pexels.com/photos/7679723/pexels-photo-7679723.jpeg?auto=compress&cs=tinysrgb&w=400",
          stockQuantity: 40,
          tags: ["cotton", "casual", "checkered", "black", "blue"],
          rating: 4.2
        },
        {
          name: "Regular Fit Cotton Casual Shirt Fabric - Black",
          description: "Ready-to-tailor cotton fabric for casual shirts in classic black color. Perfect for everyday wear with comfortable fit and easy maintenance.",
          price: 400,
          category: "men's wear",
          subcategory: "tailoring",
          image: "https://images.pexels.com/photos/7679724/pexels-photo-7679724.jpeg?auto=compress&cs=tinysrgb&w=400",
          stockQuantity: 35,
          tags: ["cotton", "casual", "black", "regular-fit"],
          rating: 4.4
        },
        {
          name: "Grey Check Formal Cotton Fabric",
          description: "Formal grey checkered cotton fabric for professional attire. Excellent quality with sophisticated appearance perfect for office wear.",
          price: 250,
          category: "men's wear",
          subcategory: "tailoring",
          image: "https://images.pexels.com/photos/7679725/pexels-photo-7679725.jpeg?auto=compress&cs=tinysrgb&w=400",
          stockQuantity: 45,
          tags: ["cotton", "formal", "grey", "checkered", "professional"],
          rating: 4.1
        },
        {
          name: "Premium Giza Cotton - Blue Square Pattern",
          description: "Premium Giza cotton with elegant blue square pattern for formal wear. Superior quality fabric with excellent durability and comfort.",
          price: 200,
          category: "men's wear",
          subcategory: "tailoring",
          image: "https://images.pexels.com/photos/7679726/pexels-photo-7679726.jpeg?auto=compress&cs=tinysrgb&w=400",
          stockQuantity: 25,
          tags: ["giza-cotton", "premium", "blue", "formal", "square-pattern"],
          rating: 4.6
        },
        // Women's wear products
        {
          name: "Elegant Silk Saree Fabric - Royal Blue",
          description: "Beautiful silk fabric perfect for traditional sarees. Rich royal blue color with excellent drape and lustrous finish.",
          price: 800,
          category: "women's wear",
          subcategory: "traditional",
          image: "https://images.pexels.com/photos/8839887/pexels-photo-8839887.jpeg?auto=compress&cs=tinysrgb&w=400",
          stockQuantity: 20,
          tags: ["silk", "saree", "royal-blue", "traditional", "elegant"],
          rating: 4.7
        },
        {
          name: "Cotton Kurti Fabric - Floral Print",
          description: "Soft cotton fabric with beautiful floral prints, perfect for casual kurtis and everyday wear.",
          price: 180,
          category: "women's wear",
          subcategory: "casual",
          image: "https://images.pexels.com/photos/8839888/pexels-photo-8839888.jpeg?auto=compress&cs=tinysrgb&w=400",
          stockQuantity: 60,
          tags: ["cotton", "kurti", "floral", "casual", "comfortable"],
          rating: 4.3
        }
      ];

      await Product.insertMany(products);
      console.log('✅ Sample products seeded successfully');
    }
  } catch (error) {
    console.error('❌ Error seeding products:', error);
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error:', error);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  seedProducts();
});

module.exports = app;