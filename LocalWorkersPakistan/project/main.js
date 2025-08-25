// Updated main.js with SQLite integration for Local Workers Pakistan
import WorkersDatabase from './database.js';

// Global database instance
let db = null;

// State
let currentCity = '', currentCategory = 'plumber', selectedWorker = null, selectedRating = 0;

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

// Initialize the application
async function initializeApp() {
    try {
        showLoadingState('Initializing database...');
        
        // Initialize database
        const dbInitialized = await initializeDatabase();
        
        if (!dbInitialized) {
            showNotification('⚠️ Database initialization had issues, but app will continue working');
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Add touch support for mobile
        addTouchSupport();
        
        hideLoadingState();
        console.log('✅ Application initialized successfully');
    } catch (error) {
        console.error('❌ Application initialization failed:', error);
        showNotification('❌ Application failed to initialize. Using offline mode.');
        hideLoadingState();
    }
}

// Initialize database connection
async function initializeDatabase() {
    try {
        // Load SQL.js library for web-based SQLite
        if (!window.initSqlJs && !window.WorkersDatabase) {
            await loadSqlJs();
        }
        
        db = new WorkersDatabase();
        const initialized = await db.init();
        
        console.log('✅ Database initialized successfully');
        return initialized;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        // Create a fallback database instance
        db = {
            workers: JSON.parse(localStorage.getItem('workers') || '[]'),
            feedback: JSON.parse(localStorage.getItem('feedback') || '[]'),
            getWorkers: async (category, city) => {
                return db.workers.filter(w => w.category === category && w.city === city);
            },
            addWorker: async (workerData) => {
                const newWorker = {
                    id: Date.now(),
                    ...workerData,
                    rating: 0,
                    total_ratings: 0,
                    created_at: new Date().toISOString()
                };
                db.workers.push(newWorker);
                localStorage.setItem('workers', JSON.stringify(db.workers));
                return newWorker;
            }
        };
        return false;
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
            const confirmed = confirm(`Are you sure you want to delete ${selectedWorker.name}? This cannot be undone.`);
            if (!confirmed) return;
            try {
                showLoadingState('Deleting profile...');
                
                if (db.deleteWorker) {
                    await db.deleteWorker(selectedWorker.id);
                } else {
                    // Fallback deletion
                    const workers = JSON.parse(localStorage.getItem('workers') || '[]');
                    const updatedWorkers = workers.filter(w => w.id !== selectedWorker.id);
                    localStorage.setItem('workers', JSON.stringify(updatedWorkers));
                }
                
                hideLoadingState();
                workerModal.classList.remove('active');
                showNotification('✅ Profile deleted successfully');
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

// Handle worker registration
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

        showLoadingState('Registering worker...');

        // Add worker to database
        const newWorker = await db.addWorker(formData);
        
        // Force save to ensure persistence
        if (db.saveToStorage) {
            await db.saveToStorage();
        } else if (db.saveToLocalStorage) {
            await db.saveToLocalStorage();
        }
        
        hideLoadingState();
        registerModal.classList.remove('active');
        resetRegistrationForm();
        
        showNotification('✅ Registration successful! Worker has been added to database.');
        
        // Refresh display if current filters match
        if (currentCategory === formData.category && currentCity === formData.city) {
            await renderWorkers();
        }

        console.log('✅ Worker registered successfully:', newWorker);
    } catch (error) {
        hideLoadingState();
        console.error('❌ Registration failed:', error);
        
        if (error.message.includes('already registered')) {
            showFieldError('regPhone', 'Phone number already registered');
            showNotification('❌ Phone number already registered');
        } else {
            showNotification('❌ Registration failed. Please try again.');
        }
    }
}

// Submit worker feedback
async function submitWorkerFeedback() {
    try {
        showLoadingState('Submitting feedback...');
        
        const comment = feedbackText.value.trim();
        
        if (db.addFeedback) {
            await db.addFeedback(selectedWorker.id, selectedRating, comment);
            
            // Update local worker object
            const updatedWorker = await db.getWorkerById(selectedWorker.id);
            if (updatedWorker) {
                selectedWorker.rating = updatedWorker.rating;
                selectedWorker.total_ratings = updatedWorker.total_ratings;
            }
        } else {
            // Fallback feedback handling
            const feedback = JSON.parse(localStorage.getItem('feedback') || '[]');
            feedback.push({
                id: Date.now(),
                worker_id: selectedWorker.id,
                rating: selectedRating,
                comment: comment,
                created_at: new Date().toISOString()
            });
            localStorage.setItem('feedback', JSON.stringify(feedback));
        }
        
        // Force save
        if (db.saveToStorage) {
            await db.saveToStorage();
        }
        
        hideLoadingState();
        feedbackModal.classList.remove('active');
        resetFeedbackForm();
        
        showNotification(`⭐ Thank you for ${selectedRating}-star rating! Rating saved successfully.`);
        
        // Refresh the display to show updated rating
        await renderWorkers();
        
        console.log('✅ Feedback submitted successfully');
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

// Render workers list
async function renderWorkers() {
    try {
        showLoadingState('Loading workers...');
        
        const workers = await db.getWorkers(currentCategory, currentCity);
        workersGrid.innerHTML = '';

        if (!workers || workers.length === 0) {
            workersGrid.innerHTML = `
                <div class="empty-state glass">
                    <h3>No ${currentCategory}s in ${currentCity}</h3>
                    <p>Be the first to register!</p>
                </div>
            `;
            hideLoadingState();
            return;
        }

        // Sort workers by rating (highest first)
        workers.sort((a, b) => (b.rating || 0) - (a.rating || 0));

        workers.forEach(worker => {
            const card = createWorkerCard(worker);
            workersGrid.appendChild(card);
        });
        
        hideLoadingState();
        console.log(`✅ Loaded ${workers.length} workers for ${currentCategory} in ${currentCity}`);
    } catch (error) {
        hideLoadingState();
        console.error('❌ Error rendering workers:', error);
        showNotification('❌ Failed to load workers');
    }
}

// Create worker card element
function createWorkerCard(worker) {
    const initials = worker.name.split(' ').map(n => n[0]).join('');
    const card = document.createElement('div');
    card.className = 'worker-card';
    card.onclick = () => showWorkerDetails(worker);
    
    const ratingStars = generateRatingStars(worker.rating || 0);
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
        const initials = worker.name.split(' ').map(n => n[0]).join('');
        
        workerInitials.textContent = initials;
        workerName.textContent = worker.name;
        workerAge.textContent = `${worker.age} years`;
        workerExp.textContent = `${worker.experience} years`;
        workerCity.textContent = worker.city;
        contactBtn.href = `tel:${worker.phone}`;
        
        // Show rating in worker details
        const ratingStars = generateRatingStars(worker.rating || 0);
        const ratingText = (worker.total_ratings || 0) > 0 ? 
            `${worker.rating || 0} (${worker.total_ratings} reviews)` : 
            'No ratings yet';
        
        // Add rating display to worker modal
        const ratingDisplay = document.createElement('div');
        ratingDisplay.className = 'worker-rating-display';
        ratingDisplay.innerHTML = `
            <div class="rating-stars">${ratingStars}</div>
            <div class="rating-text">${ratingText}</div>
        `;
        
        // Remove existing rating display if any
        const existingRating = document.querySelector('.worker-rating-display');
        if (existingRating) {
            existingRating.remove();
        }
        
        // Insert rating display after worker name
        workerName.parentNode.insertBefore(ratingDisplay, workerName.nextSibling);
        
        // Load and display recent feedback
        if (db.getWorkerFeedback) {
            await loadWorkerFeedback(worker.id);
        }
        
        workerModal.classList.add('active');
    } catch (error) {
        console.error('❌ Error showing worker details:', error);
        showNotification('❌ Failed to load worker details');
    }
}

// Load worker feedback
async function loadWorkerFeedback(workerId) {
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

// UI helper functions
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
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 4000);
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
        if (!db || !db.exportData) {
            throw new Error('Database not available');
        }
        
        const data = await db.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `workers_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('✅ Data exported successfully');
    } catch (error) {
        console.error('❌ Error exporting data:', error);
        showNotification('❌ Failed to export data');
    }
}

// Global error handler
window.addEventListener('error', function(event) {
    console.error('❌ Global error:', event.error);
    showNotification('❌ An unexpected error occurred');
});

// Cleanup on page unload - CRITICAL for data persistence
window.addEventListener('beforeunload', async function(event) {
    if (db) {
        try {
            console.log('🔄 Saving data before page unload...');
            if (db.saveToStorage) {
                await db.saveToStorage();
            } else if (db.saveToLocalStorage) {
                await db.saveToLocalStorage();
            }
            
            if (db.close) {
                await db.close();
            }
            console.log('✅ Data saved successfully on page unload');
        } catch (error) {
            console.error('❌ Error saving data on unload:', error);
        }
    }
});

// Also save data periodically (every 30 seconds)
setInterval(async () => {
    if (db && db.isInitialized) {
        try {
            if (db.saveToStorage) {
                await db.saveToStorage();
            } else if (db.saveToLocalStorage) {
                await db.saveToLocalStorage();
            }
            console.log('💾 Periodic data save completed');
        } catch (error) {
            console.error('❌ Error in periodic save:', error);
        }
    }
}, 30000);