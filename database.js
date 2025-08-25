// Simplified Database operations for Local Workers Pakistan
// Reliable localStorage-based storage with optional SQLite enhancement

class WorkersDatabase {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.workers = [];
        this.feedback = [];
    }

    // Initialize database - simplified and reliable
    async init() {
        try {
            console.log('🔄 Initializing database...');
            
            // Always load from localStorage first for reliability
            this.loadFromLocalStorage();
            
            // Try to enhance with SQLite if available
            try {
                if (typeof window !== 'undefined' && window.initSqlJs) {
                    await this.enhanceWithSqlite();
                }
            } catch (sqlError) {
                console.warn('⚠ SQLite not available, using localStorage only:', sqlError);
            }
            
            this.isInitialized = true;
            console.log('✅ Database initialized with', this.workers.length, 'workers');
            return true;
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            // Fallback to empty state but still functional
            this.workers = this.getSampleWorkers();
            this.feedback = [];
            this.saveToLocalStorage();
            this.isInitialized = true;
            return false;
        }
    }

    // Load data from localStorage - primary storage
    loadFromLocalStorage() {
        try {
            const savedWorkers = localStorage.getItem('local_workers_db');
            const savedFeedback = localStorage.getItem('local_feedback_db');
            
            if (savedWorkers) {
                this.workers = JSON.parse(savedWorkers);
                console.log('✅ Loaded', this.workers.length, 'workers from localStorage');
            } else {
                console.log('📦 No existing data, creating sample workers');
                this.workers = this.getSampleWorkers();
                this.saveToLocalStorage();
            }
            
            if (savedFeedback) {
                this.feedback = JSON.parse(savedFeedback);
                console.log('✅ Loaded', this.feedback.length, 'feedback entries from localStorage');
            } else {
                this.feedback = [];
            }
        } catch (error) {
            console.error('❌ Error loading from localStorage:', error);
            this.workers = this.getSampleWorkers();
            this.feedback = [];
            this.saveToLocalStorage();
        }
    }

    // Save to localStorage - immediate and reliable
    saveToLocalStorage() {
        try {
            localStorage.setItem('local_workers_db', JSON.stringify(this.workers));
            localStorage.setItem('local_feedback_db', JSON.stringify(this.feedback));
            localStorage.setItem('db_last_updated', new Date().toISOString());
            console.log('💾 Data saved to localStorage:', this.workers.length, 'workers');
        } catch (error) {
            console.error('❌ Error saving to localStorage:', error);
        }
    }

    // Optional SQLite enhancement (not required for functionality)
    async enhanceWithSqlite() {
        try {
            const SQL = await window.initSqlJs({
                locateFile: file => `https://sql.js.org/dist/${file}`
            });
            
            this.db = new SQL.Database();
            await this.createSqliteTables();
            
            // Sync existing data to SQLite
            for (const worker of this.workers) {
                await this.addWorkerToSqlite(worker);
            }
            
            console.log('✅ SQLite enhancement active');
        } catch (error) {
            console.warn('⚠ SQLite enhancement failed, continuing with localStorage:', error);
            this.db = null;
        }
    }

    // Create SQLite tables
    async createSqliteTables() {
        if (!this.db) return;
        
        const schema = `
            CREATE TABLE IF NOT EXISTS workers (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                age INTEGER NOT NULL,
                experience INTEGER NOT NULL,
                phone TEXT UNIQUE NOT NULL,
                category TEXT NOT NULL,
                city TEXT NOT NULL,
                rating REAL DEFAULT 0.0,
                total_ratings INTEGER DEFAULT 0,
                created_at TEXT,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY,
                worker_id INTEGER NOT NULL,
                rating INTEGER NOT NULL,
                comment TEXT,
                created_at TEXT,
                FOREIGN KEY (worker_id) REFERENCES workers(id)
            );
        `;
        
        this.db.exec(schema);
    }

    // Add worker to SQLite (optional enhancement)
    async addWorkerToSqlite(worker) {
        if (!this.db) return;
        
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO workers 
                (id, name, age, experience, phone, category, city, rating, total_ratings, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([
                worker.id, worker.name, worker.age, worker.experience,
                worker.phone, worker.category, worker.city,
                worker.rating || 0, worker.total_ratings || 0,
                worker.created_at, worker.updated_at || worker.created_at
            ]);
            
            stmt.free();
        } catch (error) {
            console.warn('⚠ SQLite sync failed for worker:', worker.name);
        }
    }

    // Get workers by category and city
    async getWorkers(category, city) {
        try {
            const filteredWorkers = this.workers.filter(w => 
                w.category === category && w.city === city
            ).sort((a, b) => (b.rating || 0) - (a.rating || 0));
            
            console.log(`📋 Found ${filteredWorkers.length} ${category}s in ${city}`);
            return filteredWorkers;
        } catch (error) {
            console.error('❌ Error getting workers:', error);
            return [];
        }
    }

    // Add new worker
    async addWorker(workerData) {
        try {
            // Check for duplicate phone
            const existingWorker = this.workers.find(w => w.phone === workerData.phone);
            if (existingWorker) {
                throw new Error('Phone number already registered');
            }

            // Create new worker with unique ID
            const newWorker = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                name: workerData.name,
                age: parseInt(workerData.age),
                experience: parseInt(workerData.experience),
                phone: workerData.phone,
                category: workerData.category,
                city: workerData.city,
                rating: 0,
                total_ratings: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Add to memory
            this.workers.push(newWorker);
            
            // Save immediately to localStorage
            this.saveToLocalStorage();
            
            // Optional SQLite sync
            if (this.db) {
                await this.addWorkerToSqlite(newWorker);
            }
            
            console.log('✅ Worker added:', newWorker.name, 'Total workers:', this.workers.length);
            return newWorker;
        } catch (error) {
            console.error('❌ Error adding worker:', error);
            throw error;
        }
    }

    // Get worker by ID
    async getWorkerById(id) {
        return this.workers.find(w => w.id == id) || null;
    }

    // Get worker by phone
    async getWorkerByPhone(phone) {
        return this.workers.find(w => w.phone === phone) || null;
    }

    // Add feedback and update rating
    async addFeedback(workerId, rating, comment = '') {
        try {
            // Create feedback entry
            const newFeedback = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                worker_id: parseInt(workerId),
                rating: parseInt(rating),
                comment: comment.trim(),
                created_at: new Date().toISOString()
            };

            // Add to feedback array
            this.feedback.push(newFeedback);

            // Update worker rating
            const worker = this.workers.find(w => w.id == workerId);
            if (worker) {
                const workerFeedback = this.feedback.filter(f => f.worker_id == workerId);
                const avgRating = workerFeedback.reduce((sum, f) => sum + f.rating, 0) / workerFeedback.length;
                
                worker.rating = Math.round(avgRating * 10) / 10;
                worker.total_ratings = workerFeedback.length;
                worker.updated_at = new Date().toISOString();
            }

            // Save immediately
            this.saveToLocalStorage();
            
            console.log('✅ Feedback added for worker:', workerId, 'Rating:', rating);
            return newFeedback;
        } catch (error) {
            console.error('❌ Error adding feedback:', error);
            throw error;
        }
    }

    // Get worker feedback
    async getWorkerFeedback(workerId) {
        try {
            return this.feedback
                .filter(f => f.worker_id == workerId)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } catch (error) {
            console.error('❌ Error getting worker feedback:', error);
            return [];
        }
    }

    // Delete worker
    async deleteWorker(workerId) {
        try {
            // Remove worker
            this.workers = this.workers.filter(w => w.id != workerId);
            
            // Remove associated feedback
            this.feedback = this.feedback.filter(f => f.worker_id != workerId);
            
            // Save immediately
            this.saveToLocalStorage();
            
            console.log('✅ Worker deleted:', workerId);
            return true;
        } catch (error) {
            console.error('❌ Error deleting worker:', error);
            throw error;
        }
    }

    // Get cities
    async getCities() {
        return [
            { name: 'Karachi', display_name: '🏙 Karachi' },
            { name: 'Lahore', display_name: '🏛 Lahore' },
            { name: 'Faisalabad', display_name: '🏢 Faisalabad' },
            { name: 'Rawalpindi', display_name: '🏗 Rawalpindi' },
            { name: 'Sialkot', display_name: '🏭 Sialkot' }
        ];
    }

    // Get categories
    async getCategories() {
        return [
            { name: 'plumber', display_name: 'Plumbers', icon: '🔧' },
            { name: 'welder', display_name: 'Welders', icon: '⚡' },
            { name: 'carpenter', display_name: 'Carpenters', icon: '🔨' }
        ];
    }

    // Get statistics
    async getStatistics() {
        try {
            const totalWorkers = this.workers.length;
            const totalFeedback = this.feedback.length;
            const avgRating = totalWorkers > 0 ? 
                this.workers.reduce((sum, w) => sum + (w.rating || 0), 0) / totalWorkers : 0;
            
            return {
                totalWorkers,
                totalFeedback,
                avgRating: Math.round(avgRating * 10) / 10
            };
        } catch (error) {
            console.error('❌ Error getting statistics:', error);
            return { totalWorkers: 0, avgRating: 0, totalFeedback: 0 };
        }
    }

    // Export data for backup
    async exportData() {
        try {
            return {
                workers: this.workers,
                feedback: this.feedback,
                exported_at: new Date().toISOString(),
                database_type: 'localStorage',
                total_workers: this.workers.length,
                total_feedback: this.feedback.length
            };
        } catch (error) {
            console.error('❌ Error exporting data:', error);
            throw error;
        }
    }

    // Get sample workers data
    getSampleWorkers() {
        return [
            {
                id: 1001,
                name: 'Ahmed Ali',
                age: 32,
                experience: 8,
                phone: '03001234567',
                category: 'plumber',
                city: 'Karachi',
                rating: 4.5,
                total_ratings: 12,
                created_at: '2024-01-01T00:00:00.000Z',
                updated_at: '2024-01-01T00:00:00.000Z'
            },
            {
                id: 1002,
                name: 'Hassan Khan',
                age: 28,
                experience: 5,
                phone: '03012345678',
                category: 'plumber',
                city: 'Lahore',
                rating: 4.2,
                total_ratings: 8,
                created_at: '2024-01-02T00:00:00.000Z',
                updated_at: '2024-01-02T00:00:00.000Z'
            },
            {
                id: 1003,
                name: 'Tariq Shah',
                age: 35,
                experience: 12,
                phone: '03123456789',
                category: 'plumber',
                city: 'Faisalabad',
                rating: 4.8,
                total_ratings: 15,
                created_at: '2024-01-03T00:00:00.000Z',
                updated_at: '2024-01-03T00:00:00.000Z'
            },
            {
                id: 1004,
                name: 'Khalil Rehman',
                age: 29,
                experience: 6,
                phone: '03456789012',
                category: 'welder',
                city: 'Karachi',
                rating: 4.4,
                total_ratings: 9,
                created_at: '2024-01-04T00:00:00.000Z',
                updated_at: '2024-01-04T00:00:00.000Z'
            },
            {
                id: 1005,
                name: 'Shahid Malik',
                age: 34,
                experience: 10,
                phone: '03567890123',
                category: 'welder',
                city: 'Lahore',
                rating: 4.7,
                total_ratings: 11,
                created_at: '2024-01-05T00:00:00.000Z',
                updated_at: '2024-01-05T00:00:00.000Z'
            },
            {
                id: 1006,
                name: 'Jameel Ahmad',
                age: 36,
                experience: 14,
                phone: '03901234567',
                category: 'carpenter',
                city: 'Karachi',
                rating: 4.9,
                total_ratings: 18,
                created_at: '2024-01-06T00:00:00.000Z',
                updated_at: '2024-01-06T00:00:00.000Z'
            },
            {
                id: 1007,
                name: 'Saleem Khan',
                age: 30,
                experience: 7,
                phone: '03012345679',
                category: 'carpenter',
                city: 'Lahore',
                rating: 4.4,
                total_ratings: 7,
                created_at: '2024-01-07T00:00:00.000Z',
                updated_at: '2024-01-07T00:00:00.000Z'
            }
        ];
    }

    // Force save - for critical moments
    async forceSave() {
        try {
            this.saveToLocalStorage();
            console.log('💾 Force save completed');
            return true;
        } catch (error) {
            console.error('❌ Force save failed:', error);
            return false;
        }
    }

    // Close database connection
    async close() {
        try {
            // Final save before closing
            this.saveToLocalStorage();
            
            if (this.db) {
                this.db.close();
                this.db = null;
            }
            
            this.isInitialized = false;
            console.log('✅ Database closed and data saved');
        } catch (error) {
            console.error('❌ Error closing database:', error);
        }
    }
}

// Export for use
export default WorkersDatabase;
if (typeof window !== 'undefined') {
    window.WorkersDatabase = WorkersDatabase;
}