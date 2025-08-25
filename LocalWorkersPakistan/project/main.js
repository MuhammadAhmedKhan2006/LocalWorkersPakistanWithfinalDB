// main.js
import WorkersDatabase from './database.js';

let db = null;
let currentCity = '';
let currentCategory = 'plumber';
let selectedWorker = null;
let selectedRating = 0;

// DOM references
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
const registerForm = document.getElementById('registerForm');
const feedbackText = document.getElementById('feedbackText');
const submitFeedback = document.getElementById('submitFeedback');
const stars = document.querySelectorAll('.star-3d');
const feedbackBtn = document.getElementById('feedbackBtn');
const deleteWorkerBtn = document.getElementById('deleteWorkerBtn');
const workerInitials = document.getElementById('workerInitials');
const workerName = document.getElementById('workerName');
const workerAge = document.getElementById('workerAge');
const workerExp = document.getElementById('workerExp');
const workerCity = document.getElementById('workerCity');
const workerStars = document.getElementById('workerStars');
const workerRatingText = document.getElementById('workerRatingText');
const contactBtn = document.getElementById('contactBtn');
const feedbackWorkerName = document.getElementById('feedbackWorkerName');

// --- Init app ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 App starting...");
    db = new WorkersDatabase();
    await db.init();
    setupEventListeners();
    document.getElementById('loader').style.display = 'none';
    console.log("✅ Ready!");
});

// --- UI Event listeners ---
function setupEventListeners() {
    confirmCity.onclick = async () => {
        if (!citySelect.value) return;
        currentCity = citySelect.value;
        selectedCitySpan.textContent = currentCity;
        cityModal.classList.remove('active');
        mainApp.classList.add('active');
        await loadAndDisplayWorkers();
    };

    changeCityBtn.onclick = () => {
        cityModal.classList.add('active');
        mainApp.classList.remove('active');
    };

    tabButtons.forEach(btn => {
        btn.onclick = async () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            updateSectionTitle();
            await loadAndDisplayWorkers();
        };
    });

    addWorkerBtn.onclick = () => registerModal.classList.add('active');
    document.querySelectorAll('.modal-close').forEach(btn =>
        btn.onclick = () => btn.closest('.modal').classList.remove('active')
    );

    registerForm.onsubmit = async e => {
        e.preventDefault();
        await handleWorkerRegistration();
    };

    stars.forEach((star, i) => {
        star.onclick = () => {
            selectedRating = i + 1;
            updateStars();
            updateRatingText();
            submitFeedback.disabled = false;
        };
    });

    submitFeedback.onclick = async () => {
        if (selectedWorker && selectedRating > 0) {
            await handleFeedback();
        }
    };

    feedbackBtn.onclick = () => {
        if (!selectedWorker) return;
        feedbackWorkerName.textContent = selectedWorker.name;
        feedbackModal.classList.add('active');
        workerModal.classList.remove('active');
    };

    deleteWorkerBtn.onclick = async () => {
        if (!selectedWorker) return;
        if (confirm(`Delete ${selectedWorker.name}?`)) {
            await db.deleteWorker(selectedWorker.id);
            await db.forceSave();
            workerModal.classList.remove('active');
            showNotification("🗑️ Worker deleted");
            await loadAndDisplayWorkers();
        }
    };
}

// --- Worker actions ---
async function handleWorkerRegistration() {
    const workerData = {
        name: document.getElementById('regName').value.trim(),
        age: parseInt(document.getElementById('regAge').value),
        experience: parseInt(document.getElementById('regExp').value),
        phone: document.getElementById('regPhone').value.trim(),
        category: document.getElementById('regCategory').value,
        city: document.getElementById('regCity').value
    };
    try {
        const newWorker = await db.addWorker(workerData);
        await db.forceSave();
        registerModal.classList.remove('active');
        registerForm.reset();
        showNotification(`✅ ${newWorker.name} registered`);
        await loadAndDisplayWorkers();
    } catch (e) {
        showNotification("❌ Registration failed: " + e.message);
    }
}

async function handleFeedback() {
    await db.addFeedback(selectedWorker.id, selectedRating, feedbackText.value.trim());
    await db.forceSave();
    feedbackModal.classList.remove('active');
    feedbackText.value = '';
    selectedRating = 0;
    showNotification("⭐ Thanks for your feedback!");
    await loadAndDisplayWorkers();
}

async function loadAndDisplayWorkers() {
    const workers = await db.getWorkers(currentCategory, currentCity);
    if (!workers || workers.length === 0) {
        workersGrid.innerHTML = `
            <div class="empty-state">
                <h3>No ${currentCategory}s found in ${currentCity}</h3>
                <p>Be the first to register!</p>
            </div>`;
        return;
    }
    workersGrid.innerHTML = workers.map(w => `
        <div class="worker-card" onclick="window.showWorkerDetails(${w.id})">
            <div class="worker-header">
                <div class="worker-avatar">${w.name.split(' ').map(n=>n[0]).join('')}</div>
                <div class="worker-info">
                    <h3>${w.name}</h3>
                    <p>📍 ${w.city}</p>
                    <div class="worker-rating">${renderStars(w.rating || 0)} 
                        <span>(${w.total_ratings || 0})</span>
                    </div>
                </div>
            </div>
            <div class="worker-stats">
                <div class="stat"><span>${w.age}</span><span>Age</span></div>
                <div class="stat"><span>${w.experience}</span><span>Years</span></div>
                <div class="stat"><span>${w.rating || 0}</span><span>Rating</span></div>
            </div>
        </div>`).join('');
}

// Expose globally for onclick
window.showWorkerDetails = async (id) => {
    selectedWorker = await db.getWorkerById(id);
    if (!selectedWorker) return;
    workerInitials.textContent = selectedWorker.name.split(' ').map(n=>n[0]).join('');
    workerName.textContent = selectedWorker.name;
    workerAge.textContent = selectedWorker.age;
    workerExp.textContent = selectedWorker.experience + " years";
    workerCity.textContent = selectedWorker.city;
    workerStars.innerHTML = renderStars(selectedWorker.rating || 0);
    workerRatingText.textContent = `${selectedWorker.rating || 0} • ${selectedWorker.total_ratings || 0} reviews`;
    contactBtn.href = `tel:${selectedWorker.phone}`;
    workerModal.classList.add('active');
};

// --- Helpers ---
function renderStars(rating) {
    const full = Math.floor(rating);
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= full) html += `<span class="star-display active">★</span>`;
        else html += `<span class="star-display">★</span>`;
    }
    return html;
}

function updateStars() {
    stars.forEach((s, i) => {
        s.classList.toggle('active', i < selectedRating);
    });
}

function updateRatingText() {
    const texts = ['Select rating','Poor','Fair','Good','Very Good','Excellent'];
    document.getElementById('ratingText').textContent = texts[selectedRating];
}

function updateSectionTitle() {
    const titles = { plumber: 'Plumbers', welder: 'Welders', carpenter: 'Carpenters' };
    sectionTitle.textContent = `Available ${titles[currentCategory]}`;
}

function showNotification(msg) {
    const note = document.getElementById('notification');
    note.textContent = msg;
    note.style.display = 'block';
    setTimeout(()=>note.style.display='none', 3000);
}

// --- Save before unload + auto-save ---
window.addEventListener('beforeunload', async () => {
    if (db) await db.forceSave();
});
setInterval(async ()=> {
    if (db) await db.forceSave();
}, 30000);
