// Simplified main.js with reliable data persistence
import WorkersDatabase from './database.js';

// Global database instance
let db = null;

// State variables
let currentCity = '';
let currentCategory = 'plumber';
let selectedWorker = null;
let selectedRating = 0;

// DOM Elements
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

// Initialize application on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Starting Local Workers Pakistan app...');
    await initializeApp();
});

// Main initialization function
async function initializeApp() {
    try {
        showLoadingState('Starting application...');
        
        // Initialize database
        console.log('📂 Initializing database...');
        db = new WorkersDatabase();
        const dbSuccess = await db.init();
        
        if (dbSuccess) {
            console.log('✅ Database initialized successfully');
        } else {
            console.warn('⚠ Database had issues but app will continue');
        }
        
        // Setup all event listeners
        setupEventListeners();
        
        // Add mobile touch support
        addMobileTouchSupport();
        
        hideLoadingState();
        
        console.log('🎉 Application ready! Database contains', (await db.getStatistics()).totalWorkers, 'workers');
        showNotification('✅ Welcome to Local Workers Pakistan!');
        
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        hideLoadingState();
        showNotification('⚠ App started with limited functionality');
        
        // Create minimal fallback
        createFallbackDatabase();
        setupEventListeners();
    }
}

// Create fallback database if main init fails
function createFallbackDatabase() {
    db = {
        workers: [],
        feedback: [],
        getWorkers: async () => [],
        addWorker: async () => ({ id: Date.now(), name: 'Test' }),
        addFeedback: async () => true,
        deleteWorker: async () => true,
        getWorkerById: async () => null,
        getWorkerFeedback: async () => [],
        getStatistics: async () => ({ totalWorkers: 0, avgRating: 0, totalFeedback: 0 }),
        forceSave: async () => true
    };
}

// Setup all event listeners
function setupEventListeners() {
    // City selection
    if (citySelect && confirmCity) {
        citySelect.onchange = () => {
            const hasValue = citySelect.value !== '';
            confirmCity.disabled = !hasValue;
            confirmCity.style.opacity = hasValue ? '1' : '0.5';
            confirmCity.style.cursor = hasValue ? 'pointer' : 'not-allowed';
        };

        confirmCity.onclick = async () => {
            if (!citySelect.value) return;
            currentCity = citySelect.value;
            selectedCitySpan.textContent = currentCity;
            hideModal(cityModal);
            showModal(mainApp);
            await loadAndDisplayWorkers();
        };
    }

    // Change city button
    if (changeCityBtn) {
        changeCityBtn.onclick = () => {
            showModal(cityModal);
            hideModal(mainApp);
        };
    }

    // Category tabs
    tabButtons.forEach(btn => {
        btn.onclick = async () => {
            // Update active tab
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentCategory = btn.dataset.category;
            updateSectionTitle();
            await loadAndDisplayWorkers();
        };
    });

    // Worker registration
    if (addWorkerBtn) {
        addWorkerBtn.onclick = () => showModal(registerModal);
    }

    // Registration form
    if (registerForm) {
        registerForm.onsubmit = async (e) => {
            e.preventDefault();
            await handleWorkerRegistration();
        };
    }

    // Feedback system
    if (feedbackBtn) {
        feedbackBtn.onclick = () => {
            if (selectedWorker) {
                document.getElementById('feedbackWorkerName').textContent = selectedWorker.name;
                resetFeedbackForm();
                hideModal(workerModal);
                showModal(feedbackModal);
            }
        };
    }

    // Star rating
    stars.forEach((star, index) => {
        star.onclick = () => {
            selectedRating = index + 1;
            updateStarDisplay();
            updateRatingText();
            if (submitFeedback) {
                submitFeedback.disabled = false;
            }
        };
    });

    // Submit feedback
    if (submitFeedback) {
        submitFeedback.onclick = async () => {
            if (selectedRating > 0 && selectedWorker) {
                await submitWorkerFeedback();
            }
        };
    }

    // Delete worker
    if (deleteWorkerBtn) {
        deleteWorkerBtn.onclick = async () => {
            if (!selectedWorker) return;
            
            const confirmDelete = confirm(`Are you sure you want to delete ${selectedWorker.name}? This action cannot be undone.`);
            if (!confirmDelete) return;
            
            await handleWorkerDeletion();
        };
    }

    // Close modals
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.onclick = () => {
            const modal = btn.closest('.modal');
            hideModal(modal);
            
            if (modal.id === 'registerModal') {
                resetRegistrationForm();
            }
        };
    });

    // Modal background clicks
    document.querySelectorAll('.modal').forEach(modal => {
        modal.onclick = (e) => {
            if (e.target === modal) {
                hideModal(modal);
                if (modal.id === 'registerModal') {
                    resetRegistrationForm();
                }
            }
        };
    });
}

// Handle worker registration
async function handleWorkerRegistration() {
    try {
        showLoadingState('Registering new worker...');
        
        const formData = getRegistrationFormData();
        
        // Clear previous errors
        clearFormErrors();
        
        // Validate data
        const validation = validateWorkerData(formData);
        if (!validation.isValid) {
            displayValidationErrors(validation.errors);
            hideLoadingState();
            return;
        }

        // Add worker to database
        const newWorker = await db.addWorker(formData);
        
        // Force save to ensure persistence
        if (db.forceSave) {
            await db.forceSave();
        }
        
        hideLoadingState();
        hideModal(registerModal);
        resetRegistrationForm();
        
        showNotification(`✅ ${newWorker.name} registered successfully!`);
        console.log('✅ New worker registered:', newWorker);
        
        // Refresh display if needed
        if (currentCategory === formData.category && currentCity === formData.city) {
            await loadAndDisplayWorkers();
        }
        
    } catch (error) {
        hideLoadingState();
        console.error('❌ Registration failed:', error);
        
        if (error.message.includes('already registered')) {
            showFieldError('regPhone', 'This phone number is already registered');
            showNotification('❌ Phone number already registered');
        } else {
            showNotification('❌ Registration failed. Please try again.');
        }
    }
}

// Handle worker feedback submission
async function submitWorkerFeedback() {
    try {
        showLoadingState('Submitting feedback...');
        
        const comment = feedbackText.value.trim();
        
        await db.addFeedback(selectedWorker.id, selectedRating, comment);
        
        // Force save
        if (db.forceSave) {
            await db.forceSave();
        }
        
        // Update selected worker data
        const updatedWorker = await db.getWorkerById(selectedWorker.id);
        if (updatedWorker) {
            selectedWorker = updatedWorker;
        }
        
        hideLoadingState();
        hideModal(feedbackModal);
        resetFeedbackForm();
        
        showNotification(`⭐ Thank you for your ${selectedRating}-star rating!`);
        console.log('✅ Feedback submitted for worker:', selectedWorker.id);
        
        // Refresh the display
        await loadAndDisplayWorkers();
        
    } catch (error) {
        hideLoadingState();
        console.error('❌ Feedback submission failed:', error);
        showNotification('❌ Failed to submit feedback. Please try again.');
    }
}

// Handle worker deletion
async function handleWorkerDeletion() {
    try {
        showLoadingState('Deleting worker...');
        
        await db.deleteWorker(selectedWorker.id);
        
        // Force save
        if (db.forceSave) {
            await db.forceSave();
        }
        
        hideLoadingState();
        hideModal(workerModal);
        
        showNotification(`✅ ${selectedWorker.name} deleted successfully`);
        console.log('✅ Worker deleted:', selectedWorker.id);
        
        selectedWorker = null;
        await loadAndDisplayWorkers();
        
    } catch (error) {
        hideLoadingState();
        console.error('❌ Worker deletion failed:', error);
        showNotification('❌ Failed to delete worker. Please try again.');
    }
}

// Load and display workers
async function loadAndDisplayWorkers() {
    try {
        showLoadingState('Loading workers...');
        
        const workers = await db.getWorkers(currentCategory, currentCity);
        
        displayWorkersGrid(workers);
        hideLoadingState();
        
        console.log(`📋 Displayed ${workers.length} ${currentCategory}s in ${currentCity}`);
        
    } catch (error) {
        hideLoadingState();
        console.error('❌ Error loading workers:', error);
        showNotification('❌ Failed to load workers');
        
        // Show empty state
        workersGrid.innerHTML = `
            <div class="empty-state glass">
                <h3>Unable to load workers</h3>
                <p>Please try refreshing the page</p>
            </div>
        `;
    }
}

// Display workers in grid
function displayWorkersGrid(workers) {
    workersGrid.innerHTML = '';
    
    if (!workers || workers.length === 0) {
        workersGrid.innerHTML = `
            <div class="empty-state glass">
                <h3>No ${currentCategory}s found in ${currentCity}</h3>
                <p>Be the first to register!</p>
                <button onclick="document.getElementById('addWorkerBtn').click()" class="btn-primary">
                    Add Worker
                </button>
            </div>
        `;
        return;
    }

    workers.forEach(worker => {
        const workerCard = createWorkerCard(worker);
        workersGrid.appendChild(workerCard);
    });
}

// Create individual worker card
function createWorkerCard(worker) {
    const card = document.createElement('div');
    card.className = 'worker-card';
    card.onclick = () => showWorkerDetails(worker);
    
    const initials = getWorkerInitials(worker.name);
    const ratingStars = generateStarRating(worker.rating || 0);
    const ratingText = (worker.total_ratings || 0) > 0 ? 
        `${worker.rating || 0} (${worker.total_ratings} reviews)` : 
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
                <span class="stat-value">${worker.total_ratings || 0}</span>
                <span class="stat-label">Reviews</span>
            </div>
        </div>
    `;
    
    return card;
}

// Show worker details modal
async function showWorkerDetails(worker) {
    try {
        selectedWorker = worker;
        
        // Populate worker details
        workerInitials.textContent = getWorkerInitials(worker.name);
        workerName.textContent = worker.name;
        workerAge.textContent = `${worker.age} years`;
        workerExp.textContent = `${worker.experience} years`;
        workerCity.textContent = worker.city;
        contactBtn.href = `tel:${worker.phone}`;
        
        // Show rating
        const ratingStars = generateStarRating(worker.rating || 0);
        const ratingText = (worker.total_ratings || 0) > 0 ? 
            `${worker.rating || 0} (${worker.total_ratings} reviews)` : 
            'No ratings yet';
        
        updateWorkerModalRating(ratingStars, ratingText);
        
        // Load and show recent feedback
        await loadAndDisplayWorkerFeedback(worker.id);
        
        showModal(workerModal);
        
    } catch (error) {
        console.error('❌ Error showing worker details:', error);
        showNotification('❌ Failed to load worker details');
    }
}

// Update rating display in worker modal
function updateWorkerModalRating(ratingStars, ratingText) {
    // Remove existing rating display
    const existingRating = document.querySelector('.worker-rating-display');
    if (existingRating) {
        existingRating.remove();
    }
    
    // Create new rating display
    const ratingDisplay = document.createElement('div');
    ratingDisplay.className = 'worker-rating-display';
    ratingDisplay.innerHTML = `
        <div class="rating-stars">${ratingStars}</div>
        <div class="rating-text">${ratingText}</div>
    `;
    
    // Insert after worker name
    workerName.parentNode.insertBefore(ratingDisplay, workerName.nextSibling);
}

// Load and display worker feedback
async function loadAndDisplayWorkerFeedback(workerId) {
    try {
        const feedback = await db.getWorkerFeedback(workerId);
        
        // Remove existing feedback display
        const existingFeedback = document.querySelector('.worker-feedback-list');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        if (feedback && feedback.length > 0) {
            const feedbackContainer = document.createElement('div');
            feedbackContainer.className = 'worker-feedback-list';
            feedbackContainer.innerHTML = '<h4>Recent Reviews:</h4>';
            
            // Show latest 3 feedback entries
            feedback.slice(0, 3).forEach(fb => {
                const feedbackItem = document.createElement('div');
                feedbackItem.className = 'feedback-item glass';
                feedbackItem.innerHTML = `
                    <div class="feedback-rating">${generateStarRating(fb.rating)}</div>
                    <div class="feedback-comment">${fb.comment || 'No comment provided'}</div>
                    <div class="feedback-date">${formatDate(fb.created_at)}</div>
                `;
                feedbackContainer.appendChild(feedbackItem);
            });
            
            // Insert feedback after rating display
            const ratingDisplay = document.querySelector('.worker-rating-display');
            if (ratingDisplay && ratingDisplay.parentNode) {
                ratingDisplay.parentNode.insertBefore(feedbackContainer, ratingDisplay.nextSibling);
            }
        }
    } catch (error) {
        console.error('❌ Error loading worker feedback:', error);
    }
}

// Utility Functions

function getRegistrationFormData() {
    return {
        name: document.getElementById('regName').value.trim(),
        age: parseInt(document.getElementById('regAge').value),
        experience: parseInt(document.getElementById('regExp').value),
        phone: document.getElementById('regPhone').value.trim(),
        category: document.getElementById('regCategory').value,
        city: document.getElementById('regCity').value
    };
}

function validateWorkerData(data) {
    const errors = [];
    
    if (!data.name || data.name.length < 2) {
        errors.push({ field: 'regName', message: 'Name must be at least 2 characters' });
    }
    
    if (!data.age || data.age < 18 || data.age > 70) {
        errors.push({ field: 'regAge', message: 'Age must be between 18 and 70' });
    }
    
    if (data.experience < 0 || data.experience > 50) {
        errors.push({ field: 'regExp', message: 'Experience must be between 0 and 50 years' });
    }
    
    if (!data.phone || data.phone.length !== 11 || !data.phone.startsWith('03')) {
        errors.push({ field: 'regPhone', message: 'Phone must be 11 digits starting with 03' });
    }
    
    if (!data.category) {
        errors.push({ field: 'regCategory', message: 'Please select a category' });
    }
    
    if (!data.city) {
        errors.push({ field: 'regCity', message: 'Please select a city' });
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

function displayValidationErrors(errors) {
    errors.forEach(error => {
        showFieldError(error.field, error.message);
    });
    showNotification('❌ Please fix the form errors');
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('error');
        
        // Remove existing error
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        errorDiv.style.cssText = 'color: #ff6b6b; font-size: 12px; margin-top: 5px;';
        
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

function getWorkerInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function generateStarRating(rating) {
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

function resetFeedbackForm() {
    selectedRating = 0;
    feedbackText.value = '';
    updateStarDisplay();
    updateRatingText();
    if (submitFeedback) {
        submitFeedback.disabled = true;
    }
}

function resetRegistrationForm() {
    registerForm.reset();
    clearFormErrors();
}

function updateStarDisplay() {
    stars.forEach((star, index) => {
        star.classList.toggle('active', index < selectedRating);
    });
}

function updateRatingText() {
    const ratingTextEl = document.getElementById('ratingText');
    if (ratingTextEl) {
        ratingTextEl.textContent = selectedRating > 0 ? 
            `${selectedRating}-star rating` : 
            'Select a rating';
    }
}

function updateSectionTitle() {
    const titles = {
        plumber: 'Available Plumbers',
        welder: 'Available Welders', 
        carpenter: 'Available Carpenters'
    };
    sectionTitle.textContent = titles[currentCategory] || 'Available Workers';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short', 
        day: 'numeric'
    });
}

// Modal helper functions
function showModal(modal) {
    if (modal) {
        modal.classList.add('active');
    }
}

function hideModal(modal) {
    if (modal) {
        modal.classList.remove('active');
    }
}

// Loading state functions
function showLoadingState(message = 'Loading...') {
    let loader = document.getElementById('globalLoader');
    if (!loader) {
        loader = createLoader();
    }
    loader.querySelector('.loader-text').textContent = message;
    loader.style.display = 'flex';
}

function hideLoadingState() {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.style.display = 'none';
    }
}

function createLoader() {
    const loader = document.createElement('div');
    loader.id = 'globalLoader';
    loader.className = 'loader-overlay';
    loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    loader.innerHTML = `
        <div class="loader-content glass" style="padding: 20px; border-radius: 10px; text-align: center;">
            <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>
            <div class="loader-text" style="color: white; font-size: 16px;">Loading...</div>
        </div>
    `;
    document.body.appendChild(loader);
    return loader;
}

// Notification function
function showNotification(message, duration = 4000) {
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
        z-index: 10001;
        font-size: 14px;
        max-width: 300px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, duration);
}

// Mobile touch support
function addMobileTouchSupport() {
    // Add touch feedback
    const touchElements = document.querySelectorAll('button, .worker-card, .tab-btn, .btn');
    touchElements.forEach(element => {
        element.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.95)';
        });
        
        element.addEventListener('touchend', function() {
            this.style.transform = '';
        });
    });
    
    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    console.log('📱 Mobile touch support added');
}

// Critical: Save data before page unload
window.addEventListener('beforeunload', async function(event) {
    if (db && db.forceSave) {
        try {
            console.log('💾 Saving data before page unload...');
            await db.forceSave();
            console.log('✅ Data saved successfully before unload');
        } catch (error) {
            console.error('❌ Error saving data before unload:', error);
        }
    }
});

// Periodic data save every 30 seconds
setInterval(async () => {
    if (db && db.forceSave && db.isInitialized) {
        try {
            await db.forceSave();
            console.log('💾 Periodic save completed');
        } catch (error) {
            console.error('❌ Periodic save failed:', error);
        }
    }
}, 30000);

// Global error handler
window.addEventListener('error', function(event) {
    console.error('❌ Global error:', event.error);
    showNotification('❌ An unexpected error occurred');
});

console.log('📋 Local Workers Pakistan - Main script loaded');