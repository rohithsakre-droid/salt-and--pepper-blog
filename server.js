const express = require('express');
const app = express();
const PORT = 3000;

// === NEW ===
// This "middleware" teaches Express to read JSON data from POST requests
app.use(express.json());

// === NEW ===
// This serves all your static files (HTML, CSS, JS) from the current folder
app.use(express.static('.'));

// === NEW: API Endpoint for Registration ===
// Listens for a POST request to "/api/register"
app.post('/api/register', (req, res) => {
    // req.body contains the JSON data sent from the front-end
    const { username, email, password } = req.body;

    // For now, we just log it to the terminal to prove it worked
    console.log('--- New User Registration ---');
    console.log('Username:', username);
    console.log('Email:', email);
    console.log('Password:', password, '(In a real app, hash this!)');

    // Send a success response back to the front-end
    res.json({ message: 'User registered successfully!' });
});
// === NEW: API Endpoint for Login ===
// Listens for a POST request to "/api/login"
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    // For now, we just log it to the terminal.
    // LATER, we will check this against a real database.
    console.log('--- User Login Attempt ---');
    console.log('Email:', email);
    console.log('Password:', password);

    // For now, let's just pretend the login is always successful
    // We will send back a (fake) "auth token"
    if (email && password) {
        res.json({ 
            message: 'Login successful!',
            token: 'fake-auth-token-12345' // This is a placeholder
        });
    } else {
        res.status(400).json({ message: 'Email and password are required.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Your website is now available at http://localhost:3000');
});