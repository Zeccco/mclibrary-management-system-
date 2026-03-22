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

// Initialize Firebase (only once)
if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// ====================
// AUTHENTICATION STATE MANAGEMENT
// ====================

auth.onAuthStateChanged((user) => {
    if (user) {
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'index.html' || currentPage === 'signup.html' || currentPage === 'forgot-password.html' || currentPage === '') {
            window.location.href = 'dashboard.html';
        }
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userId', user.uid);
    } else {
        const currentPage = window.location.pathname.split('/').pop();
        const publicPages = ['index.html', 'signup.html', 'forgot-password.html', ''];
        if (!publicPages.includes(currentPage) && currentPage !== '') {
            window.location.href = 'index.html';
        }
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
    }
});

// ====================
// LOGIN FUNCTION
// ====================
async function loginUser(email, password) {
    const errorElement = document.getElementById('loginError');
    
    if (!email || !password) {
        if (errorElement) {
            errorElement.style.display = 'flex';
            errorElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please enter both email and password';
        }
        return false;
    }
    
    if (errorElement) {
        errorElement.style.display = 'flex';
        errorElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    }
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        // Update last login
        await db.collection('users').doc(userCredential.user.uid).set({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        showToast('Login successful! Redirecting...', 'success');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        
        return true;
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = '';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'Account not found. Please sign up first.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email format.';
                break;
            default:
                errorMessage = error.message;
        }
        
        if (errorElement) {
            errorElement.style.display = 'flex';
            errorElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + errorMessage;
        }
        return false;
    }
}

// ====================
// SIGNUP FUNCTION
// ====================
async function signupUser(name, email, password, confirmPassword) {
    const errorElement = document.getElementById('signupError');
    
    if (!name || !email || !password || !confirmPassword) {
        if (errorElement) {
            errorElement.style.display = 'flex';
            errorElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please fill in all fields';
        }
        return false;
    }
    
    if (password !== confirmPassword) {
        if (errorElement) {
            errorElement.style.display = 'flex';
            errorElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Passwords do not match';
        }
        return false;
    }
    
    if (password.length < 6) {
        if (errorElement) {
            errorElement.style.display = 'flex';
            errorElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Password must be at least 6 characters';
        }
        return false;
    }
    
    if (errorElement) {
        errorElement.style.display = 'flex';
        errorElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    }
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            role: 'user',
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
        let errorMessage = '';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Email already registered. Please login instead.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Use at least 6 characters.';
                break;
            default:
                errorMessage = error.message;
        }
        
        if (errorElement) {
            errorElement.style.display = 'flex';
            errorElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + errorMessage;
        }
        return false;
    }
}

// ====================
// PASSWORD RESET FUNCTION
// ====================
async function resetPassword(email) {
    const errorElement = document.getElementById('resetError');
    const successElement = document.getElementById('resetSuccess');
    
    if (!email) {
        if (errorElement) {
            errorElement.style.display = 'flex';
            errorElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please enter your email address';
        }
        return false;
    }
    
    if (errorElement) {
        errorElement.style.display = 'flex';
        errorElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending reset email...';
    }
    
    try {
        await auth.sendPasswordResetEmail(email);
        if (successElement) {
            successElement.style.display = 'flex';
            successElement.innerHTML = '<i class="fas fa-check-circle"></i> Password reset email sent! Check your inbox.';
        }
        if (errorElement) errorElement.style.display = 'none';
        return true;
    } catch (error) {
        console.error('Reset error:', error);
        let errorMessage = '';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email.';
                break;
            default:
                errorMessage = error.message;
        }
        
        if (errorElement) {
            errorElement.style.display = 'flex';
            errorElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + errorMessage;
        }
        return false;
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
function showToast(message, type = 'info') {
    // Remove any existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function getCurrentUser() {
    return auth.currentUser;
}

async function getUserProfile() {
    const user = getCurrentUser();
    if (user) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) return userDoc.data();
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
    }
    return null;
}

function protectPage() {
    if (!getCurrentUser()) {
        window.location.href = 'index.html';
    }
    return getCurrentUser();
}

// Make functions globally available
window.loginUser = loginUser;
window.signupUser = signupUser;
window.resetPassword = resetPassword;
window.logoutUser = logoutUser;
window.getCurrentUser = getCurrentUser;
window.getUserProfile = getUserProfile;
window.protectPage = protectPage;
window.showToast = showToast;