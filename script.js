// This script will handle both the login and register forms.

// Check if the login form exists on the page
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(event) {
        // Prevent the default form submission (which reloads the page)
        event.preventDefault();

        // Get the values from the input fields
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // For now, we'll just log the data to the console
        console.log('Login attempt:');
        console.log('Email:', email);
        console.log('Password:', password);

        // In a real application, you would send this data to a server
        alert('Login data captured! Check the console for details.');
    });
}

// Check if the register form exists on the page
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', function(event) {
        // Prevent the default form submission
        event.preventDefault();

        // Get the values from the input fields
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Log the data to the console
        console.log('Registration attempt:');
        console.log('Username:', username);
        console.log('Email:', email);
        console.log('Password:', password);
        
        // In a real application, you would send this data to a server
        alert('Registration data captured! Check the console for details.');
    });
}
