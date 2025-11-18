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
                // Save token and user to localStorage and go to the blog page
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                window.location.href = 'blog.html';
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
                // Save token and user and go to blog page
                if (result.token) {
                    localStorage.setItem('token', result.token);
                }
                if (result.user) {
                    localStorage.setItem('user', JSON.stringify(result.user));
                }
                window.location.href = 'blog.html';
            }

        } catch (error) {
            console.error('Error during registration:', error);
            alert('Registration failed. Please try again.');
        }
    });
}

// --- Small API helper that injects Authorization header when token exists ---
async function apiFetch(url, opts = {}) {
    const token = localStorage.getItem('token');
    const headers = opts.headers || {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    opts.headers = headers;
    return fetch(url, opts);
}

// --- Blog page logic: fetch and render blogs, handle create form ---
async function loadBlogs() {
    const container = document.getElementById('blogsContainer');
    if (!container) return;
    try {
        const res = await apiFetch('/api/blogs');
        const data = await res.json();
        const blogs = data.blogs || [];
        container.innerHTML = '';
        if (blogs.length === 0) {
            container.innerHTML = '<p>No posts yet.</p>';
            return;
        }
        const storedUser = localStorage.getItem('user');
        const currentUser = storedUser ? JSON.parse(storedUser) : null;
        for (const b of blogs) {
            const el = document.createElement('article');
            el.className = 'post';
            const author = b.author ? (b.author.username || b.author.email) : 'Unknown';
            const canDelete = currentUser && b.author && (String(b.author._id) === String(currentUser.id) || String(b.author._id) === String(currentUser._id));
            el.innerHTML = `
                <h3>${escapeHtml(b.title)}</h3>
                <p class="meta">By ${escapeHtml(author)} — ${new Date(b.createdAt).toLocaleString()}</p>
                ${b.imageUrl ? `<img src="${escapeHtml(b.imageUrl)}" alt="post image" class="post-image">` : ''}
                <div class="post-body">${escapeHtml(b.body)}</div>
                ${canDelete ? `<div class="post-actions"><button class="delete-btn" data-id="${b._id}">Delete</button></div>` : ''}
            `;
            container.appendChild(el);
        }
        // attach delete handlers
        const dels = container.querySelectorAll('.delete-btn');
        dels.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = btn.getAttribute('data-id');
                if (!confirm('Delete this post?')) return;
                try {
                    const token = localStorage.getItem('token');
                    const resp = await fetch('/api/blogs/' + id, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': 'Bearer ' + token
                        }
                    });
                    const j = await resp.json();
                    if (!resp.ok) return alert(j.message || 'Delete failed');
                    alert('Post deleted');
                    await loadBlogs();
                } catch (err) {
                    console.error('Delete failed', err);
                    alert('Delete failed');
                }
            });
        });
    } catch (err) {
        console.error('Failed to load blogs', err);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Create blog form handling
const createBlogForm = document.getElementById('createBlogForm');
if (createBlogForm) {
    // image preview handler
    const blogImageInput = document.getElementById('blogImage');
    const imagePreviewWrap = document.getElementById('imagePreview');
    const blogImagePreview = document.getElementById('blogImagePreview');
    if (blogImageInput) {
        blogImageInput.addEventListener('change', () => {
            const f = blogImageInput.files && blogImageInput.files[0];
            if (!f) {
                if (imagePreviewWrap) imagePreviewWrap.style.display = 'none';
                if (blogImagePreview) blogImagePreview.src = '';
                return;
            }
            const url = URL.createObjectURL(f);
            if (blogImagePreview) blogImagePreview.src = url;
            if (imagePreviewWrap) imagePreviewWrap.style.display = 'block';
        });
    }
    createBlogForm.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const title = document.getElementById('blogTitle').value;
        const body = document.getElementById('blogBody').value;
        const imageInput = document.getElementById('blogImage');

        if (!title || !body) {
            alert('Title and body are required');
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('body', body);
        if (imageInput && imageInput.files && imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) return alert('You must be logged in to create a blog post');

            const res = await fetch('/api/blogs', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });
            const result = await res.json();
            if (!res.ok) {
                alert(result.message || 'Failed to create blog');
                return;
            }
            alert('Post created');
            createBlogForm.reset();
            await loadBlogs();
        } catch (err) {
            console.error('Error creating blog', err);
            alert('Failed to create blog');
        }
    });
}

// If on blog page, load blogs and toggle create form visibility
if (document.getElementById('blogsContainer')) {
    document.addEventListener('DOMContentLoaded', () => {
        const token = localStorage.getItem('token');
        const createFormWrap = document.getElementById('createFormWrap');
        if (createFormWrap) {
            createFormWrap.style.display = token ? 'block' : 'none';
        }
        loadBlogs();
    });
}

// Logout helper (if a logout button exists)
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });
}

// Top logout button (in header) and user status update
function updateHeader() {
    const stored = localStorage.getItem('user');
    const user = stored ? JSON.parse(stored) : null;
    const userStatus = document.getElementById('userStatus');
    const topLogout = document.getElementById('topLogoutBtn');
    const navLogin = document.getElementById('navLogin');
    const navProfile = document.getElementById('navProfile');
    if (userStatus) {
        userStatus.textContent = user ? `Hi, ${user.username || user.email}` : '';
    }
    if (topLogout) {
        topLogout.style.display = user ? 'inline-block' : 'none';
        topLogout.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    }
    if (navLogin) {
        navLogin.style.display = user ? 'none' : 'inline-block';
    }
    if (navProfile) {
        if (user) {
            navProfile.style.display = 'inline-block';
            navProfile.textContent = user.username || user.email || 'PROFILE';
        } else {
            navProfile.style.display = 'none';
            navProfile.textContent = 'PROFILE';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateHeader();
});

// --- Homepage blogs loader ---
async function loadHomeBlogs() {
    const grid = document.getElementById('homeBlogsGrid');
    if (!grid) return;
    try {
        const res = await apiFetch('/api/blogs');
        const data = await res.json();
        const blogs = data.blogs || [];
        grid.innerHTML = '';
        if (blogs.length === 0) {
            grid.innerHTML = '<p style="text-align:center; color:var(--text-secondary)">No posts yet.</p>';
            return;
        }
        const storedUser = localStorage.getItem('user');
        const currentUser = storedUser ? JSON.parse(storedUser) : null;

        for (const b of blogs) {
            const card = document.createElement('article');
            card.className = 'post-card';
            const author = b.author ? (b.author.username || b.author.email) : 'Unknown';
            const avatarLetter = author ? (author[0] || 'U').toUpperCase() : 'U';
            const canDelete = currentUser && b.author && (String(b.author._id) === String(currentUser.id) || String(b.author._id) === String(currentUser._id));

            card.innerHTML = `
                <a href="#" class="post-image-link">
                    ${b.imageUrl ? `<img src="${escapeHtml(b.imageUrl)}" alt="${escapeHtml(b.title)}" onerror="this.onerror=null;this.src='https://placehold.co/400x300/cccccc/ffffff?text=Blog+Post';">` : ''}
                </a>
                <div class="post-content">
                    <div class="post-meta">
                        <span class="author-avatar">${escapeHtml(avatarLetter)}</span>
                        <span class="author-name">${escapeHtml(author)}</span>
                        <span class="meta-dot">·</span>
                        <span class="post-date">${new Date(b.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 class="post-title"><a href="#">${escapeHtml(b.title)}</a></h3>
                    <p class="post-excerpt">${escapeHtml(b.body ? b.body.slice(0, 160) : '')}...</p>
                    ${canDelete ? `<div class="post-actions"><button class="delete-btn" data-id="${b._id}">Delete</button></div>` : ''}
                </div>
            `;

            grid.appendChild(card);
        }

        // attach delete handlers same as blog page
        const dels = grid.querySelectorAll('.delete-btn');
        dels.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = btn.getAttribute('data-id');
                if (!confirm('Delete this post?')) return;
                try {
                    const token = localStorage.getItem('token');
                    const resp = await fetch('/api/blogs/' + id, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': 'Bearer ' + token
                        }
                    });
                    const j = await resp.json();
                    if (!resp.ok) return alert(j.message || 'Delete failed');
                    alert('Post deleted');
                    await loadHomeBlogs();
                    await loadBlogs();
                } catch (err) {
                    console.error('Delete failed', err);
                    alert('Delete failed');
                }
            });
        });

    } catch (err) {
        console.error('Failed to load home blogs', err);
        grid.innerHTML = '<p style="text-align:center;color:var(--text-secondary)">Failed to load posts.</p>';
    }
}

// Load homepage blogs if container exists
document.addEventListener('DOMContentLoaded', () => {
    loadHomeBlogs();
});