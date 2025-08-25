// Updated main.js with cross-device synchronization for Local Workers Pakistan
import WorkersDatabase from './database.js';

// Global database instance
let workersDB = null;

// Updated main.js with cross-device synchronization for Local Workers Pakistan
import WorkersDatabase from './database.js';

// Global database instance
let db = null;

// State
let currentCity = '', currentCategory = 'plumber', selectedWorker = null, selectedRating = 0;
let isOnline = navigator.onLine;
let lastUpdateTime = 0;

// Elements
const cityModal = document.getElementById('cityModal');
const mainApp = document.getElementById('mainApp');
const citySelect = document.getElementById('citySelect');
const confirmCity = document.getElementById('confirmCity');
const selectedCitySpan = document.getElementById('selectedCity');
const changeCityBtn = document.getElementById('changeCity');
const tabButtons = document.querySelectorAll('.tab-btn');
const sectionTitle = document.getElementById('sectionTitle');
const workersGrid = document.getElementById('workersGrid');
const addWorkerBtn = document.getElementById('addWorkerBtn');
const workerModal = document.getElementById('workerModal');
const registerModal = document.getElementById('registerModal');
const feedbackModal = document.getElementById('feedbackModal');
const workerInitials = document.getElementById('workerInitials');
const workerName = document.getElementById('workerName');
const workerAge = document.getElementById('workerAge');
const workerExp = document.getElementById('workerExp');
const workerCity = document.getElementById('workerCity');
const contactBtn = document.getElementById('contactBtn');
const feedbackBtn = document.getElementById('feedbackBtn');
const deleteWorkerBtn = document.getElementById('deleteWorkerBtn');
const registerForm = document.getElementById('registerForm');
const stars = document.querySelectorAll('.star-3d');
const feedbackText = document.getElementById('feedbackText');
const submitFeedback = document.getElementById('submitFeedback');

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
});

// Initialize the application with sync support
async function initializeApp() {
    try {
        showLoadingState('Initializing database with sync...');
        
        // Initialize database with sync capabilities
        await initializeDatabase();
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup cross-device sync listeners
        setupSyncListeners();
        
        // Add touch support for mobile
        addTouchSupport();
        
        // Setup online/offline detection
        setupNetworkListeners();
        
        hideLoadingState();
        console.log('✅ Application initialized successfully with sync');
    } catch (error) {
        console.error('❌ Application initialization failed:', error);
        showNotification('⚠️ Application started in offline mode');
        hideLoadingState();
    }
}

// Initialize database connection with sync
async function initializeDatabase() {
    try {
        // Load SQL.js library for web-based SQLite
        if (!window.initSqlJs) {
            await loadSqlJs();
        }
        
        workersDB = new WorkersDatabase();
        await workersDB.init();
        
        // Make renderWorkers available globally for sync callbacks
        window.renderWorkers = renderWorkers;
        
        console.log('✅ Database initialized successfully with sync');
        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        // Fallback to localStorage will be handled by WorkersDatabase
        return false;
    }
}

// Setup cross-device synchronization listeners
function setupSyncListeners() {
    try {
        // Listen for updates from database
        if (workersDB && workersDB.listenForUpdates) {
            workersDB.listenForUpdates();
        }
        
        // Listen for storage changes from other tabs/windows
        window.addEventListener('storage', async (e) => {
            if (e.key && e.key.includes('workers_pakistan_sync')) {
                console.log('🔄 Data updated in another tab, refreshing...');
                await refreshCurrentView();
                showNotification('🔄 Data updated from another device');
            }
        });
        
        // Listen for page visibility changes
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden && workersDB) {
                // Page became visible, sync data
                console.log('🔄 Page became visible, syncing data...');
                await refreshCurrentView();
            }
        });
        
        console.log('✅ Sync listeners setup complete');
    } catch (error) {
        console.error('❌ Error setting up sync listeners:', error);
    }
}

// Setup network status listeners
function setupNetworkListeners() {
    window.addEventListener('online', () => {
        isOnline = true;
        showNotification('🌐 Connection restored - syncing data...');
        if (workersDB && workersDB.syncWithCloud) {
            workersDB.syncWithCloud();
        }
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        showNotification('📱 Working offline - data will sync when connection is restored');
    });
}

// Refresh current view with latest data
async function refreshCurrentView() {
    try {
        if (currentCity && currentCategory) {
            await renderWorkers();
            lastUpdateTime = Date.now();
        }
    } catch (error) {
        console.error('❌ Error refreshing view:', error);
    }
}

// Load SQL.js library
async function loadSqlJs() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://sql.js.org/dist/sql-wasm.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Setup all event listeners
function setupEventListeners() {
    // City selection
    citySelect.onchange = () => {
        confirmCity.disabled = !citySelect.value;
        if (citySelect.value) {
            confirmCity.style.opacity = '1';
            confirmCity.style.cursor = 'pointer';
        } else {
            confirmCity.style.opacity = '0.5';
            confirmCity.style.cursor = 'not-allowed';
        }
    };
    
    // Initialize button state
    confirmCity.disabled = true;
    confirmCity.style.opacity = '0.5';
    confirmCity.style.cursor = 'not-allowed';
    
    confirmCity.onclick = async () => {
        if (!citySelect.value) return;
        currentCity = citySelect.value;
        selectedCitySpan.textContent = currentCity;
        cityModal.classList.remove('active');
        mainApp.classList.add('active');
        await renderWorkers();
    };
    
    changeCityBtn.onclick = () => {
        cityModal.classList.add('active');
        mainApp.classList.remove('active');
    };

    // Category tabs
    tabButtons.forEach(btn => {
        btn.onclick = async () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            updateTitle();
            await renderWorkers();
        };
    });

    // Modal controls
    addWorkerBtn.onclick = () => {
        registerModal.classList.add('active');
    };

    feedbackBtn.onclick = () => {
        if (selectedWorker) {
            document.getElementById('feedbackWorkerName').textContent = selectedWorker.name;
            resetFeedbackForm();
            workerModal.classList.remove('active');
            feedbackModal.classList.add('active');
        }
    };

    // Delete worker
    if (deleteWorkerBtn) {
        deleteWorkerBtn.onclick = async () => {
            if (!selectedWorker) return;
            const confirmed = confirm(`Are you sure you want to delete ${selectedWorker.name}? This will be removed from all devices.`);
            if (!confirmed) return;
            try {
                showLoadingState('Deleting profile and syncing...');
                await workersDB.deleteWorker(selectedWorker.id);
                hideLoadingState();
                workerModal.classList.remove('active');
                showNotification('✅ Profile deleted and synced across all devices');
                await renderWorkers();
            } catch (error) {
                hideLoadingState();
                console.error('❌ Error deleting worker:', error);
                showNotification('❌ Failed to delete profile');
            }
        };
    }

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.onclick = () => {
            const modal = btn.closest('.modal');
            modal.classList.remove('active');
            
            if (modal.id === 'registerModal') {
                resetRegistrationForm();
            }
        };
    });

    // Modal background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.onclick = e => {
            if (e.target === modal) {
                modal.classList.remove('active');
                if (modal.id === 'registerModal') {
                    resetRegistrationForm();
                }
            }
        };
    });

    // Registration form
    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        await handleRegistration();
    };

    // Star rating system
    stars.forEach(star => {
        star.onclick = () => {
            selectedRating = +star.dataset.rating;
            updateStars();
            updateRatingText();
            submitFeedback.disabled = false;
        };
    });

    // Submit feedback
    submitFeedback.onclick = async () => {
        if (selectedRating > 0 && selectedWorker) {
            await submitWorkerFeedback();
        }
    };
}

// Handle worker registration with sync
async function handleRegistration() {
    try {
        const formData = {
            name: document.getElementById('regName').value.trim(),
            age: parseInt(document.getElementById('regAge').value),
            experience: parseInt(document.getElementById('regExp').value),
            phone: document.getElementById('regPhone').value.trim(),
            category: document.getElementById('regCategory').value,
            city: document.getElementById('regCity').value
        };

        // Clear previous errors
        clearFormErrors();

        // Validate form data
        const validation = validateWorkerData(formData);
        if (!validation.isValid) {
            showValidationErrors(validation.errors);
            return;
        }

        showLoadingState('Registering worker and syncing across devices...');

        // Add worker to database (this will trigger sync automatically)
        const newWorker = await workersDB.addWorker(formData);
        
        hideLoadingState();
        registerModal.classList.remove('active');
        resetRegistrationForm();
        
        showNotification('✅ Registration successful! Now visible on all devices with this link.');
        
        // Refresh display if current filters match
        if (currentCategory === formData.category && currentCity === formData.city) {
            await renderWorkers();
        }

        console.log('✅ Worker registered and synced successfully:', newWorker);
    } catch (error) {
        hideLoadingState();
        console.error('❌ Registration failed:', error);
        
        if (error.message.includes('already registered')) {
            showFieldError('regPhone', 'Phone number already registered');
            showNotification('❌ Phone number already registered on another device');
        } else {
            showNotification('❌ Registration failed. Please try again.');
        }
    }
}

// Submit worker feedback with sync
async function submitWorkerFeedback() {
    try {
        showLoadingState('Submitting feedback and syncing...');
        
        const comment = feedbackText.value.trim();
        await workersDB.addFeedback(selectedWorker.id, selectedRating, comment);
        
        // Update local worker object
        const updatedWorker = await workersDB.getWorkerById(selectedWorker.id);
        if (updatedWorker) {
            selectedWorker.rating = updatedWorker.rating;
            selectedWorker.total_ratings = updatedWorker.total_ratings;
        }
        
        hideLoadingState();
        feedbackModal.classList.remove('active');
        resetFeedbackForm();
        
        showNotification(`⭐ Thank you for ${selectedRating}-star rating! Updated across all devices.`);
        
        // Refresh the display to show updated rating
        await renderWorkers();
        
        console.log('✅ Feedback submitted and synced successfully');
    } catch (error) {
        hideLoadingState();
        console.error('❌ Error submitting feedback:', error);
        showNotification('❌ Failed to submit feedback. Please try again.');
    }
}

// Validate worker registration data
function validateWorkerData(data) {
    const errors = [];
    
    if (!data.name || data.name.length < 2) {
        errors.push({ field: 'regName', message: 'Name must be at least 2 characters' });
    }
    
    if (!data.age || data.age < 18 || data.age > 70) {
        errors.push({ field: 'regAge', message: 'Age must be between 18-70' });
    }
    
    if (data.experience < 0 || data.experience > 50) {
        errors.push({ field: 'regExp', message: 'Experience must be between 0-50 years' });
    }
    
    if (!data.phone || data.phone.length !== 11 || !data.phone.startsWith('03')) {
        errors.push({ field: 'regPhone', message: 'Phone must be 11 digits starting with 03' });
    }
    
    if (!data.category) {
        errors.push({ field: 'regCategory', message: 'Category is required' });
    }
    
    if (!data.city) {
        errors.push({ field: 'regCity', message: 'City is required' });
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Show validation errors
function showValidationErrors(errors) {
    errors.forEach(error => {
        showFieldError(error.field, error.message);
    });
    showNotification('❌ Please fix the errors above');
}

// Render workers list with sync status
async function renderWorkers() {
    try {
        showLoadingState('Loading latest data from all devices...');
        
        // Get workers with auto-sync
        const workers = await workersDB.getWorkers(currentCategory, currentCity);
        workersGrid.innerHTML = '';

        if (!workers || workers.length === 0) {
            workersGrid.innerHTML = `
                <div class="empty-state glass">
                    <h3>No ${currentCategory}s in ${currentCity}</h3>
                    <p>Be the first to register and it will show on all devices!</p>
                    <div class="sync-status">
                        <span class="sync-indicator ${isOnline ? 'online' : 'offline'}"></span>
                        ${isOnline ? 'Connected - Live sync active' : 'Offline - Will sync when connected'}
                    </div>
                </div>
            `;
            hideLoadingState();
            return;
        }

        // Sort workers by rating (highest first)
        workers.sort((a, b) => b.rating - a.rating);

        workers.forEach(worker => {
            const card = createWorkerCard(worker);
            workersGrid.appendChild(card);
        });
        
        // Add sync status indicator
        addSyncStatusIndicator();
        
        hideLoadingState();
        console.log(`✅ Loaded ${workers.length} synced workers for ${currentCategory} in ${currentCity}`);
    } catch (error) {
        hideLoadingState();
        console.error('❌ Error rendering workers:', error);
        showNotification('❌ Failed to load workers');
    }
}

// Add sync status indicator to the UI
function addSyncStatusIndicator() {
    const existingIndicator = document.querySelector('.sync-status-bar');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    const syncBar = document.createElement('div');
    syncBar.className = 'sync-status-bar';
    syncBar.innerHTML = `
        <div class="sync-info">
            <span class="sync-indicator ${isOnline ? 'online' : 'offline'}"></span>
            <span class="sync-text">
                ${isOnline ? '🔄 Live sync active - Data shared across all devices' : '📱 Offline mode - Will sync when connected'}
            </span>
        </div>
    `;
    
    // Add some basic styling
    syncBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 8px 16px;
        text-align: center;
        font-size: 12px;
        z-index: 1000;
        backdrop-filter: blur(10px);
    `;
    
    document.body.appendChild(syncBar);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        if (syncBar.parentNode) {
            syncBar.style.transform = 'translateY(-100%)';
            setTimeout(() => syncBar.remove(), 300);
        }
    }, 3000);
}

// Create worker card element
function createWorkerCard(worker) {
    const initials = worker.name.split(' ').map(n => n[0]).join('');
    const card = document.createElement('div');
    card.className = 'worker-card';
    card.onclick = () => showWorkerDetails(worker);
    
    const ratingStars = generateRatingStars(worker.rating);
    const ratingText = worker.total_ratings > 0 ? 
        `${worker.rating} (${worker.total_ratings} reviews)` : 
        'No ratings yet';
    
    card.innerHTML = `
        <div class="worker-header">
            <div class="worker-avatar">${initials}</div>
            <div class="worker-info">
                <div class="worker-name">${worker.name}</div>
                <div class="worker-location">${worker.city}</div>
                <div class="worker-rating">
                    ${ratingStars}
                    <span class="rating-text">${ratingText}</span>
                </div>
            </div>
        </div>
        <div class="worker-stats">
            <div class="stat">
                <span class="stat-value">${worker.age}</span>
                <span class="stat-label">Age</span>
            </div>
            <div class="stat">
                <span class="stat-value">${worker.experience}</span>
                <span class="stat-label">Years Exp</span>
            </div>
            <div class="stat">
                <span class="stat-value">${worker.total_ratings}</span>
                <span class="stat-label">Reviews</span>
            </div>
        </div>
        <div class="sync-badge">🔄 Synced</div>
    `;
    
    return card;
}

// Show worker details modal
async function showWorkerDetails(worker) {
    try {
        selectedWorker = worker;
        const initials = worker.name.split(' ').map(n => n[0]).join('');
        
        workerInitials.textContent = initials;
        workerName.textContent = worker.name;
        workerAge.textContent = `${worker.age} years`;
        workerExp.textContent = `${worker.experience} years`;
        workerCity.textContent = worker.city;
        contactBtn.href = `tel:${worker.phone}`;
        
        // Show rating in worker details
        const ratingStars = generateRatingStars(worker.rating);
        const ratingText = worker.total_ratings > 0 ? 
            `${worker.rating} (${worker.total_ratings} reviews)` : 
            'No ratings yet';
        
        // Add rating display to worker modal
        const ratingDisplay = document.createElement('div');
        ratingDisplay.className = 'worker-rating-display';
        ratingDisplay.innerHTML = `
            <div class="rating-stars">${ratingStars}</div>
            <div class="rating-text">${ratingText}</div>
            <div class="sync-info">✅ Data synced across all devices</div>
        `;
        
        // Remove existing rating display if any
        const existingRating = document.querySelector('.worker-rating-display');
        if (existingRating) {
            existingRating.remove();
        }
        
        // Insert rating display after worker name
        workerName.parentNode.insertBefore(ratingDisplay, workerName.nextSibling);
        
        // Load and display recent feedback
        await loadWorkerFeedback(worker.id);
        
        workerModal.classList.add('active');
    } catch (error) {
        console.error('❌ Error showing worker details:', error);
        showNotification('❌ Failed to load worker details');
    }
}

// Load worker feedback
async function loadWorkerFeedback(workerId) {
    try {
        const feedback = await workersDB.getWorkerFeedback(workerId);
        
        // Remove existing feedback display
        const existingFeedback = document.querySelector('.worker-feedback-list');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        if (feedback && feedback.length > 0) {
            const feedbackContainer = document.createElement('div');
            feedbackContainer.className = 'worker-feedback-list';
            feedbackContainer.innerHTML = '<h4>Recent Reviews (Synced from all devices):</h4>';
            
            // Show latest 3 feedback entries
            feedback.slice(0, 3).forEach(fb => {
                const feedbackItem = document.createElement('div');
                feedbackItem.className = 'feedback-item glass';
                feedbackItem.innerHTML = `
                    <div class="feedback-rating">${generateRatingStars(fb.rating)}</div>
                    <div class="feedback-comment">${fb.comment || 'No comment'}</div>
                    <div class="feedback-date">${formatDate(fb.created_at)}</div>
                `;
                feedbackContainer.appendChild(feedbackItem);
            });
            
            // Insert after rating display
            const ratingDisplay = document.querySelector('.worker-rating-display');
            if (ratingDisplay) {
                ratingDisplay.parentNode.insertBefore(feedbackContainer, ratingDisplay.nextSibling);
            }
        }
    } catch (error) {
        console.error('❌ Error loading worker feedback:', error);
    }
}

// Generate star rating HTML
function generateRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let starsHTML = '';
    
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            starsHTML += '<span class="star-display active">★</span>';
        } else if (i === fullStars + 1 && hasHalfStar) {
            starsHTML += '<span class="star-display half">★</span>';
        } else {
            starsHTML += '<span class="star-display">★</span>';
        }
    }
    
    return starsHTML;
}

// Update section title
function updateTitle() {
    const titles = {
        plumber: 'Available Plumbers', 
        welder: 'Available Welders', 
        carpenter: 'Available Carpenters'
    };
    sectionTitle.textContent = titles[currentCategory];
}

// Reset feedback form
function resetFeedbackForm() {
    selectedRating = 0;
    feedbackText.value = '';
    updateStars();
    updateRatingText();
    submitFeedback.disabled = true;
}

// Reset registration form
function resetRegistrationForm() {
    registerForm.reset();
    clearFormErrors();
}

// Update star display
function updateStars() {
    stars.forEach((star, i) => star.classList.toggle('active', i < selectedRating));
}

// Update rating text
function updateRatingText() {
    const ratingText = document.getElementById('ratingText');
    if (ratingText) {
        if (selectedRating > 0) {
            ratingText.textContent = `${selectedRating}-star rating`;
        } else {
            ratingText.textContent = 'Select rating';
        }
    }
}

// Form validation helpers
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('error');
        
        // Remove existing error message
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        errorDiv.style.color = '#ff6b6b';
        errorDiv.style.fontSize = '12px';
        errorDiv.style.marginTop = '5px';
        errorDiv.style.fontStyle = 'italic';
        
        field.parentNode.appendChild(errorDiv);
    }
}

function clearFormErrors() {
    const inputs = registerForm.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.classList.remove('error');
        const errorDiv = input.parentNode.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    });
}

// UI helper functions with sync feedback
function showLoadingState(message = 'Loading...') {
    const loader = document.getElementById('loader') || createLoader();
    loader.querySelector('.loader-text').textContent = message;
    loader.style.display = 'flex';
}

function hideLoadingState() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.display = 'none';
    }
}

function createLoader() {
    const loader = document.createElement('div');
    loader.id = 'loader';
    loader.className = 'loader-overlay';
    loader.innerHTML = `
        <div class="loader-content glass">
            <div class="spinner"></div>
            <div class="loader-text">Loading...</div>
        </div>
    `;
    document.body.appendChild(loader);
    return loader;
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.1);
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Add touch support for mobile devices
function addTouchSupport() {
    // Add touch feedback to buttons
    const buttons = document.querySelectorAll('button, .worker-card, .tab-btn');
    buttons.forEach(button => {
        button.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.95)';
        });
        
        button.addEventListener('touchend', function() {
            this.style.transform = '';
        });
    });
    
    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
}

// Export data function for backup
async function exportData() {
    try {
        if (!workersDB) {
            throw new Error('Database not initialized');
        }
        
        const data = await workersDB.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `workers_backup_synced_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('✅ Synced data exported successfully');
    } catch (error) {
        console.error('❌ Error exporting data:', error);
        showNotification('❌ Failed to export data');
    }
}

// Manual sync function (can be called by user)
async function manualSync() {
    try {
        showLoadingState('Syncing with all devices...');
        if (workersDB && workersDB.syncWithCloud) {
            await workersDB.syncWithCloud();
            await refreshCurrentView();
            showNotification('✅ Data synced successfully across all devices');
        }
    } catch (error) {
        console.error('❌ Manual sync failed:', error);
        showNotification('❌ Sync failed - will retry automatically');
    } finally {
        hideLoadingState();
    }
}

// Global error handler
window.addEventListener('error', function(event) {
    console.error('❌ Global error:', event.error);
    showNotification('❌ An unexpected error occurred');
});

// Cleanup on page unload
window.addEventListener('beforeunload', async function() {
    if (workersDB) {
        await workersDB.close();
    }
});

// Make some functions globally available
window.manualSync = manualSync;
window.exportData = exportData;