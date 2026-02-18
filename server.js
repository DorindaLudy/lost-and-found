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
    approved: false   // NEW
};


    items.push(newItem);

    res.redirect('/search.html');
});

// ----------------------------
// Get All Items (Search Page)
// ----------------------------
app.get('/items', (req, res) => {
    const approvedItems = items.filter(item => item.approved);
    res.json(approvedItems);
});


// ----------------------------
// Submit Claim
// ----------------------------
app.post('/submit-claim', (req, res) => {

    const newClaim = {
    id: claims.length + 1,
    itemId: req.body.item_id,
    name: req.body.name,
    email: req.body.email,
    type: req.body.requestType,
    message: req.body.message,
    status: "pending"
};


    claims.push(newClaim);

    res.redirect('/search.html');
});

app.post('/approve-claim/:id', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).send("Not authorized");

    const claim = claims.find(c => c.id == req.params.id);

    if (claim) {
        claim.status = "approved";

        // Remove the item when approved
        items = items.filter(i => i.id != claim.itemId);
    }

    res.sendStatus(200);
});



// ----------------------------
// Admin Login
// ----------------------------
const ADMIN_PASSWORD = "admin123";

app.post('/admin-login', (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.redirect('/admin-dashboard');  // NOT .html
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

app.get('/admin', (req, res) => {
    if (req.session.isAdmin) {
        return res.redirect('/admin-dashboard');
    } else {
        return res.redirect('/admin-login.html');
    }
});

// ----------------------------
// Admin Data (Protected API)
// ----------------------------
app.get('/admin-data', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).send("Not authorized");
    }

    res.json({ items, claims });
});

app.post('/approve-item/:id', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).send("Not authorized");

    const item = items.find(i => i.id == req.params.id);
    if (item) item.approved = true;

    res.sendStatus(200);
});

app.post('/delete-item/:id', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).send("Not authorized");

    items = items.filter(i => i.id != req.params.id);
    res.sendStatus(200);
});

// ----------------------------
// Logout Route (Optional but smart)
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


async function approveClaim(id) {
    await fetch('/approve-claim/' + id, { method: 'POST' });
    loadAdminData();
}

async function rejectClaim(id) {
    await fetch('/reject-claim/' + id, { method: 'POST' });
    loadAdminData();
}
