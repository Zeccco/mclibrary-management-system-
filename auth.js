// ====================
// FIREBASE AUTHENTICATION MODULE
// Professional Library System
// ====================

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAv3HaMVSZOWO1-R1kq0hBIyzaMe6qJz08",
    authDomain: "library-web-app-bf033.firebaseapp.com",
    projectId: "library-web-app-bf033",
    storageBucket: "library-web-app-bf033.firebasestorage.app",
    messagingSenderId: "767632185573",
    appId: "1:767632185573:web:4e5ff30593d436cba7dc0c"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// ====================
// AUTHENTICATION STATE MANAGEMENT
// ====================

// Check authentication state
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is logged in
        const protectedPages = ['dashboard.html', 'catalog.html', 'members.html', 'circulation.html', 'fines.html'];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (currentPage === 'index.html' || currentPage === 'login.html' || currentPage === 'signup.html' || currentPage === 'forgot-password.html') {
            window.location.href = 'dashboard.html';
        }
        
        // Store user info for display
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userId', user.uid);
        
        // Check if user is admin (optional)
        checkUserRole(user);
    } else {
        // User is logged out
        const publicPages = ['index.html', 'login.html', 'signup.html', 'forgot-password.html', ''];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (!publicPages.includes(currentPage) && currentPage !== '') {
            window.location.href = 'index.html';
        }
        
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
    }
});

// Check user role (optional)
async function checkUserRole(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const role = userDoc.data().role;
            localStorage.setItem('userRole', role);
            
            // Role-based UI adjustments
            if (role === 'admin') {
                document.body.classList.add('admin-mode');
            } else {
                document.body.classList.add('user-mode');
            }
        }
    } catch (error) {
        console.error('Error checking role:', error);
    }
}

// ====================
// LOGIN FUNCTION
// ====================
async function loginUser(email, password) {
    const errorElement = document.getElementById('loginError');
    
    if (!email || !password) {
        showError(errorElement, 'Please enter both email and password');
        return false;
    }
    
    showLoading();
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        showToast('Login successful! Redirecting...', 'success');
        
        // Update last login
        await db.collection('users').doc(userCredential.user.uid).set({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        
        return true;
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed. ';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage += 'Account not found. Please sign up first.';
                break;
            case 'auth/wrong-password':
                errorMessage += 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Invalid email format.';
                break;
            case 'auth/user-disabled':
                errorMessage += 'This account has been disabled.';
                break;
            case 'auth/too-many-requests':
                errorMessage += 'Too many failed attempts. Please try again later.';
                break;
            default:
                errorMessage += error.message;
        }
        
        showError(errorElement, errorMessage);
        return false;
    } finally {
        hideLoading();
    }
}

// ====================
// SIGNUP FUNCTION
// ====================
async function signupUser(name, email, password, confirmPassword) {
    const errorElement = document.getElementById('signupError');
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
        showError(errorElement, 'Please fill in all fields');
        return false;
    }
    
    if (password !== confirmPassword) {
        showError(errorElement, 'Passwords do not match');
        return false;
    }
    
    if (password.length < 6) {
        showError(errorElement, 'Password must be at least 6 characters');
        return false;
    }
    
    if (!isValidEmail(email)) {
        showError(errorElement, 'Please enter a valid email address');
        return false;
    }
    
    showLoading();
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Create user profile in Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            role: 'user', // Default role
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        });
        
        showToast('Account created successfully! Redirecting...', 'success');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
        return true;
    } catch (error) {
        console.error('Signup error:', error);
        let errorMessage = 'Signup failed. ';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage += 'Email already registered. Please login instead.';
                break;
            case 'auth/weak-password':
                errorMessage += 'Password is too weak. Use at least 6 characters.';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Invalid email format.';
                break;
            default:
                errorMessage += error.message;
        }
        
        showError(errorElement, errorMessage);
        return false;
    } finally {
        hideLoading();
    }
}

// ====================
// PASSWORD RESET FUNCTION
// ====================
async function resetPassword(email) {
    const errorElement = document.getElementById('resetError');
    const successElement = document.getElementById('resetSuccess');
    
    if (!email || !isValidEmail(email)) {
        showError(errorElement, 'Please enter a valid email address');
        return false;
    }
    
    showLoading();
    
    try {
        await auth.sendPasswordResetEmail(email);
        showSuccess(successElement, 'Password reset email sent! Check your inbox.');
        return true;
    } catch (error) {
        console.error('Reset error:', error);
        let errorMessage = 'Password reset failed. ';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage += 'No account found with this email.';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Invalid email format.';
                break;
            default:
                errorMessage += error.message;
        }
        
        showError(errorElement, errorMessage);
        return false;
    } finally {
        hideLoading();
    }
}

// ====================
// LOGOUT FUNCTION
// ====================
async function logoutUser() {
    try {
        await auth.signOut();
        showToast('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error logging out', 'error');
    }
}

// ====================
// UTILITY FUNCTIONS
// ====================

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showError(element, message) {
    if (element) {
        element.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

function showSuccess(element, message) {
    if (element) {
        element.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function showLoading() {
    let overlay = document.querySelector('.loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// ====================
// GET CURRENT USER INFO
// ====================
function getCurrentUser() {
    const user = auth.currentUser;
    if (user) {
        return {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified
        };
    }
    return null;
}

async function getUserProfile() {
    const user = getCurrentUser();
    if (user) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                return userDoc.data();
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
    }
    return null;
}

// ====================
// PROTECT PAGE FUNCTION
// ====================
function protectPage() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
    }
    return user;
}

// ====================
// CHECK ADMIN ROLE
// ====================
async function isAdmin() {
    const user = getCurrentUser();
    if (user) {
        const profile = await getUserProfile();
        return profile && profile.role === 'admin';
    }
    return false;
}

// Export functions for global use
window.loginUser = loginUser;
window.signupUser = signupUser;
window.resetPassword = resetPassword;
window.logoutUser = logoutUser;
window.getCurrentUser = getCurrentUser;
window.getUserProfile = getUserProfile;
window.protectPage = protectPage;
window.isAdmin = isAdmin;