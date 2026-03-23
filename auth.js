// ====================
// FIREBASE AUTHENTICATION MODULE
// Professional Library System with Role Management
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
// ROLE DEFINITIONS
// ====================
const ROLES = {
    ADMIN: 'admin',
    LIBRARIAN: 'librarian',
    STAFF: 'staff'
};

// Permission definitions
const PERMISSIONS = {
    [ROLES.ADMIN]: {
        manageUsers: true,
        manageBooks: true,
        manageMembers: true,
        manageCirculation: true,
        manageFines: true,
        viewReports: true,
        deleteData: true,
        editBooks: true,
        editMembers: true
    },
    [ROLES.LIBRARIAN]: {
        manageUsers: false,
        manageBooks: true,
        manageMembers: true,
        manageCirculation: true,
        manageFines: true,
        viewReports: true,
        deleteData: false,
        editBooks: true,
        editMembers: true
    },
    [ROLES.STAFF]: {
        manageUsers: false,
        manageBooks: false,
        manageMembers: false,
        manageCirculation: false,
        manageFines: false,
        viewReports: true,
        deleteData: false,
        editBooks: false,
        editMembers: false
    }
};

// Global variable to store current user role
let currentUserRole = null;
let currentUserData = null;

// ====================
// AUTHENTICATION STATE MANAGEMENT
// ====================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const currentPage = window.location.pathname.split('/').pop();
        
        // Fetch user role from Firestore
        await loadCurrentUserRole(user.uid);
        
        // Redirect logic
        if (currentPage === 'index.html' || currentPage === 'signup.html' || 
            currentPage === 'forgot-password.html' || currentPage === '') {
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
        currentUserRole = null;
        currentUserData = null;
    }
});

// ====================
// ROLE MANAGEMENT FUNCTIONS
// ====================
async function loadCurrentUserRole(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            currentUserData = userDoc.data();
            currentUserRole = currentUserData.role || ROLES.STAFF;
        } else {
            // If no role set, default to STAFF
            currentUserRole = ROLES.STAFF;
        }
        return currentUserRole;
    } catch (error) {
        console.error('Error loading user role:', error);
        currentUserRole = ROLES.STAFF;
        return ROLES.STAFF;
    }
}

function getCurrentUserRole() {
    return currentUserRole || ROLES.STAFF;
}

function getCurrentUserData() {
    return currentUserData;
}

async function hasPermission(permission) {
    const role = getCurrentUserRole();
    return PERMISSIONS[role]?.[permission] || false;
}

function canEditBooks() {
    return getCurrentUserRole() === ROLES.ADMIN || getCurrentUserRole() === ROLES.LIBRARIAN;
}

function canEditMembers() {
    return getCurrentUserRole() === ROLES.ADMIN || getCurrentUserRole() === ROLES.LIBRARIAN;
}

function canManageCirculation() {
    return getCurrentUserRole() === ROLES.ADMIN || getCurrentUserRole() === ROLES.LIBRARIAN;
}

function canDeleteData() {
    return getCurrentUserRole() === ROLES.ADMIN;
}

function isAdmin() {
    return getCurrentUserRole() === ROLES.ADMIN;
}

function isLibrarian() {
    return getCurrentUserRole() === ROLES.LIBRARIAN;
}

function isStaff() {
    return getCurrentUserRole() === ROLES.STAFF;
}

// ====================
// USER MANAGEMENT FUNCTIONS (Admin only)
// ====================
async function getAllUsers() {
    if (!isAdmin()) {
        throw new Error('Permission denied: Only admins can view users');
    }
    
    const usersSnapshot = await db.collection('users').get();
    return usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

async function updateUserRole(userId, newRole) {
    if (!isAdmin()) {
        throw new Error('Permission denied: Only admins can update roles');
    }
    
    if (!Object.values(ROLES).includes(newRole)) {
        throw new Error('Invalid role');
    }
    
    await db.collection('users').doc(userId).update({
        role: newRole,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: auth.currentUser?.uid
    });
    
    return true;
}

async function createStaffAccount(email, password, name, role = ROLES.STAFF) {
    if (!isAdmin()) {
        throw new Error('Permission denied: Only admins can create staff accounts');
    }
    
    try {
        // Create Firebase Auth user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Create user profile with role
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            role: role,
            status: 'active',
            createdBy: auth.currentUser?.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: null
        });
        
        showToast(`${name} (${role}) account created successfully!`, 'success');
        return true;
    } catch (error) {
        console.error('Error creating staff account:', error);
        showToast('Error creating account: ' + error.message, 'error');
        return false;
    }
}

async function deleteUserAccount(userId) {
    if (!isAdmin()) {
        throw new Error('Permission denied: Only admins can delete users');
    }
    
    // Cannot delete your own account
    if (userId === auth.currentUser?.uid) {
        throw new Error('Cannot delete your own account');
    }
    
    await db.collection('users').doc(userId).delete();
    return true;
}

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
        
        // Check if user exists in Firestore
        const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
        
        if (!userDoc.exists) {
            // First user becomes admin, others become staff
            const usersSnapshot = await db.collection('users').limit(1).get();
            const isFirstUser = usersSnapshot.empty;
            
            await db.collection('users').doc(userCredential.user.uid).set({
                name: email.split('@')[0],
                email: email,
                role: isFirstUser ? ROLES.ADMIN : ROLES.STAFF,
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Update last login
            await db.collection('users').doc(userCredential.user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Load role
        await loadCurrentUserRole(userCredential.user.uid);
        
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
        
        // Check if this is the first user (becomes admin)
        const usersSnapshot = await db.collection('users').limit(1).get();
        const isFirstUser = usersSnapshot.empty;
        
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            role: isFirstUser ? ROLES.ADMIN : ROLES.STAFF,
            status: 'active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
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

// Role functions
window.getCurrentUserRole = getCurrentUserRole;
window.hasPermission = hasPermission;
window.canEditBooks = canEditBooks;
window.canEditMembers = canEditMembers;
window.canManageCirculation = canManageCirculation;
window.canDeleteData = canDeleteData;
window.isAdmin = isAdmin;
window.isLibrarian = isLibrarian;
window.isStaff = isStaff;
window.getAllUsers = getAllUsers;
window.updateUserRole = updateUserRole;
window.createStaffAccount = createStaffAccount;
window.deleteUserAccount = deleteUserAccount;
window.ROLES = ROLES;
