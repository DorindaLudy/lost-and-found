const express = require('express');
const multer = require('multer');
const session = require('express-session');
const path = require('path');

const app = express();

// ----------------------------
// Middleware
// ----------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: false
}));

// Serve public folder
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------
// File Upload Setup
// ----------------------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// ----------------------------
// In-Memory Database
// ----------------------------
let items = [];
let claims = [];

// ----------------------------
// Submit Found Item
// ----------------------------
app.post('/submit-item', upload.single('photo'), (req, res) => {

    const newItem = {
        id: items.length + 1,
        name: req.body.item_name,
        description: req.body.description,
        category: req.body.category,
        date: req.body.date,
        studentName: req.body.name,
        studentEmail: req.body.email,
        photo: req.file ? req.file.filename : null,
        approved: false
    };

    items.push(newItem);
    res.redirect('/search.html');
});

// ----------------------------
// Get Approved Items (Search Page)
// ----------------------------
app.get('/items', (req, res) => {
    const approvedItems = items.filter(item => item.approved);
    res.json(approvedItems);
});

// ----------------------------
// Submit Claim OR Inquiry
// ----------------------------
app.post('/submit-claim', (req, res) => {

    const newClaim = {
        id: claims.length + 1,
        itemId: parseInt(req.body.item_id),
        name: req.body.name,
        email: req.body.email,
        type: req.body.requestType, // "claim" or "inquiry"
        message: req.body.message,
        status: "pending"
    };

    claims.push(newClaim);
    res.redirect('/search.html');
});

// ----------------------------
// Approve Claim / Resolve Inquiry
// ----------------------------
app.post('/approve-claim/:id', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).send("Not authorized");

    const claim = claims.find(c => c.id == req.params.id);
    if (!claim) return res.status(404).send("Claim not found");

    claim.status = "approved";

    // ONLY remove item if it is a CLAIM
    if (claim.type === "claim") {
        items = items.filter(item => item.id !== claim.itemId);
    }

    res.sendStatus(200);
});

// ----------------------------
// Reject Claim / Inquiry
// ----------------------------
app.post('/reject-claim/:id', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).send("Not authorized");

    const claim = claims.find(c => c.id == req.params.id);
    if (!claim) return res.status(404).send("Claim not found");

    claim.status = "rejected";
    res.sendStatus(200);
});

// ----------------------------
// Admin Login
// ----------------------------
const ADMIN_PASSWORD = "admin123";

app.post('/admin-login', (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.redirect('/admin-dashboard');
    } else {
        res.send("Wrong password");
    }
});

// ----------------------------
// Protected Admin Dashboard
// ----------------------------
app.get('/admin-dashboard', (req, res) => {
    if (!req.session.isAdmin) {
        return res.redirect('/admin-login.html');
    }

    res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

// ----------------------------
// Admin Data
// ----------------------------
app.get('/admin-data', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).send("Not authorized");
    }

    res.json({ items, claims });
});

// ----------------------------
// Approve Item Posting
// ----------------------------
app.post('/approve-item/:id', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).send("Not authorized");

    const item = items.find(i => i.id == req.params.id);
    if (item) item.approved = true;

    res.sendStatus(200);
});

// ----------------------------
// Delete Item
// ----------------------------
app.post('/delete-item/:id', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).send("Not authorized");

    items = items.filter(i => i.id != req.params.id);
    res.sendStatus(200);
});

// ----------------------------
// Logout
// ----------------------------
app.get('/admin-logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// ----------------------------
// Start Server
// ----------------------------
app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});
