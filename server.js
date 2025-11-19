const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs'); // Required for file system operations

const User = require('./models/User');
const Blog = require('./models/Blog');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const MONGO_BASE = process.env.MONGO_BASE || 'mongodb://localhost:27017/';
const DB_NAME = process.env.DB_NAME || 'salt-and-pepper-blog';
const MONGO_URI = `${MONGO_BASE}${DB_NAME}`;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// --- FIX 1: Ensure 'uploads' directory exists on startup ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log('Created "uploads" directory successfully.');
}

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB:', MONGO_URI);
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.')); // Serves your HTML files from root
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serves images

// --- FIX 2: Multer Setup with Limits ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        // Creates a unique filename: timestamp-randomnumber.extension
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});

// Define upload instance with 5MB limit
const upload = multer({ 
    storage,
    limits: { fileSize: 1024 * 1024 * 5 } // 5MB Limit
});

// Helpers
function generateToken(user) {
    return jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: 'No authorization header' });
    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ message: 'Invalid authorization format' });
    const token = parts[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

// Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) return res.status(400).json({ message: 'username, email and password are required' });

        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ message: 'Email already registered' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = new User({ username, email, passwordHash });
        await user.save();

        const token = generateToken(user);
        res.json({ message: 'User registered', token, user: { id: user._id, username: user.username, email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'email and password required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

        const token = generateToken(user);
        res.json({ message: 'Login successful', token, user: { id: user._id, username: user.username, email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- FIX 3: Robust Blog Creation Route ---
// We wrap the upload logic to catch "File too large" errors explicitly
app.post('/api/blogs', authMiddleware, (req, res, next) => {
    const uploadSingle = upload.single('image');

    uploadSingle(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading (e.g. file too large)
            console.error('Multer upload error:', err);
            return res.status(400).json({ message: `Upload error: ${err.message}` });
        } else if (err) {
            // An unknown error occurred when uploading
            console.error('Unknown upload error:', err);
            return res.status(500).json({ message: 'An unknown error occurred during file upload.' });
        }
        
        // If no error, proceed to the next middleware (the actual blog saving logic)
        next();
    });
}, async (req, res) => {
    try {
        const { title, body } = req.body;
        
        // Note: req.body is only populated AFTER the upload middleware runs successfully
        if (!title || !body) return res.status(400).json({ message: 'title and body required' });

        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const blog = new Blog({ title, body, imageUrl, author: req.user.id });
        await blog.save();

        res.json({ message: 'Blog created', blog });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// List blogs
app.get('/api/blogs', async (req, res) => {
    try {
        const blogs = await Blog.find().populate('author', 'username email').sort({ createdAt: -1 });
        res.json({ blogs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a blog (protected) - only author can delete
app.delete('/api/blogs/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const blog = await Blog.findById(id);
        if (!blog) return res.status(404).json({ message: 'Blog not found' });
        
        // Check author
        if (String(blog.author) !== String(req.user.id)) return res.status(403).json({ message: 'Not authorized' });

        // Remove image file if exists
        if (blog.imageUrl) {
            try {
                // Fix: robust path joining
                const relativePath = blog.imageUrl.startsWith('/') ? blog.imageUrl.slice(1) : blog.imageUrl;
                const filePath = path.join(__dirname, relativePath);
                
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log('Deleted image file:', filePath);
                }
            } catch (err) {
                console.warn('Failed to remove image file', err);
            }
        }

        await Blog.deleteOne({ _id: id });
        res.json({ message: 'Blog deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});