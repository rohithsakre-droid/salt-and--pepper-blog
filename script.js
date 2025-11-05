// This script will handle both the login and register forms.

// Check if the login form exists on the page
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    // === UPDATED: Made the function async ===
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // === NEW: Send data to the server ===
        try {
            const data = { email, password };

            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            alert(result.message); // Show "Login successful!"

            if (response.ok) {
                // If successful, log the token and redirect to homepage
                console.log('Login successful! Token:', result.token);
                // We'll learn how to *use* this token later
                window.location.href = 'index.html'; // Go to homepage
            }

        } catch (error) {
            console.error('Error during login:', error);
            alert('Login failed. Please try again.');
        }
    });
}

// Check if the register form exists on the page
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    // === UPDATED: Made the function async ===
    registerForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        // Get the values
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // === NEW: Send data to the server ===
        try {
            // Pack the data into a JavaScript object
            const data = { username, email, password };

            // Send a POST request to our API endpoint
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            // Get the JSON response from the server
            const result = await response.json();

            // Show the server's message to the user
            alert(result.message);

            if (response.ok) {
                // If successful, maybe redirect to login
                console.log('Registration successful!');
                window.location.href = 'login.html'; // Go to login page
            }

        } catch (error) {
            console.error('Error during registration:', error);
            alert('Registration failed. Please try again.');
        }
    });
}