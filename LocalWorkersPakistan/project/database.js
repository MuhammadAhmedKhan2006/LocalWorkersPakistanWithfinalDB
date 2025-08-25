               // Database operations for Local Workers Pakistan
// This file handles all SQLite database interactions with fallback to localStorage

class WorkersDatabase {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.isLocalStorage = false;
    }

    // Initialize database connection
    async init() {
        try {
            console.log('🔄 Initializing database...');
            
            // Try SQL.js first
            if (typeof window !== 'undefined' && window.initSqlJs) {
                await this.initSqlJs();
            } else {
                console.log('⚠️ SQL.js not available, falling back to localStorage');
                this.fallbackToLocalStorage();
            }
            
            this.isInitialized = true;
            console.log('✅ Database initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            this.fallbackToLocalStorage();
            return false;
        }
    }

    // Initialize SQL.js
    async initSqlJs() {
        try {
            const SQL = await window.initSqlJs({
                locateFile: file => `https://sql.js.org/dist/${file}`
            });
            
            // Try to load existing database from localStorage
            const savedData = localStorage.getItem('workers_db_sqlite');
            if (savedData) {
                try {
                    const uint8Array = new Uint8Array(JSON.parse(savedData));
                    this.db = new SQL.Database(uint8Array);
                    console.log('✅ Loaded existing SQLite database from storage');
                } catch (e) {
                    console.log('⚠️ Failed to load saved database, creating new one');
                    this.db = new SQL.Database();
                    await this.createTables();
                    await this.insertSampleData();
                }
            } else {
                this.db = new SQL.Database();
                await this.createTables();
                await this.insertSampleData();
                console.log('✅ Created new SQLite database with sample data');
            }
            
            this.isLocalStorage = false;
        } catch (error) {
            console.error('❌ SQL.js initialization failed:', error);
            throw error;
        }
    }

    // Fallback to localStorage if SQLite fails
    fallbackToLocalStorage() {
        console.log('🔄 Falling back to localStorage...');
        this.isLocalStorage = true;
        
        this.db = {
            workers: JSON.parse(localStorage.getItem('workers') || '[]'),
            feedback: JSON.parse(localStorage.getItem('feedback') || '[]')
        };
        
        // Initialize with sample data if empty
        if (this.db.workers.length === 0) {
            this.db.workers = this.getSampleWorkers();
            this.saveToLocalStorage();
        }
        
        this.isInitialized = true;
        console.log('✅ localStorage fallback initialized');
    }

    // Save SQLite database to localStorage
    saveToStorage() {
        try {
            if (!this.isLocalStorage && this.db) {
                const data = this.db.export();
                localStorage.setItem('workers_db_sqlite', JSON.stringify(Array.from(data)));

                // Also persist a JSON mirror so fallback mode can load user data
                try {
                    const workersResult = this.db.exec("SELECT * FROM workers");
                    const feedbackResult = this.db.exec("SELECT * FROM feedback");
                    const workersJson = workersResult.length > 0 ? this.formatExportData(workersResult[0]) : [];
                    const feedbackJson = feedbackResult.length > 0 ? this.formatExportData(feedbackResult[0]) : [];
                    localStorage.setItem('workers', JSON.stringify(workersJson));
                    localStorage.setItem('feedback', JSON.stringify(feedbackJson));
                } catch (mirrorError) {
                    console.warn('⚠️ Failed to write JSON mirror for fallback:', mirrorError);
                }
            } else if (this.isLocalStorage) {
                this.saveToLocalStorage();
            }
        } catch (error) {
            console.error('❌ Error saving to storage:', error);
        }
    }

    // Save data to localStorage (fallback mode)
    saveToLocalStorage() {
        if (this.isLocalStorage) {
            localStorage.setItem('workers', JSON.stringify(this.db.workers));
            localStorage.setItem('feedback', JSON.stringify(this.db.feedback));
        }
    }

    // Create database tables
    async createTables() {
        const schema = `
            PRAGMA foreign_keys = ON;
            
            CREATE TABLE IF NOT EXISTS workers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                age INTEGER NOT NULL CHECK (age >= 18 AND age <= 70),
                experience INTEGER NOT NULL CHECK (experience >= 0 AND experience <= 50),
                phone TEXT UNIQUE NOT NULL CHECK (length(phone) = 11 AND phone GLOB '03[0-9]*'),
                category TEXT NOT NULL CHECK (category IN ('plumber', 'welder', 'carpenter')),
                city TEXT NOT NULL CHECK (city IN ('Karachi', 'Lahore', 'Faisalabad', 'Rawalpindi', 'Sialkot')),
                rating REAL DEFAULT 0.0 CHECK (rating >= 0.0 AND rating <= 5.0),
                total_ratings INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                worker_id INTEGER NOT NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_workers_category ON workers(category);
            CREATE INDEX IF NOT EXISTS idx_workers_city ON workers(city);
            CREATE INDEX IF NOT EXISTS idx_workers_rating ON workers(rating DESC);
            CREATE INDEX IF NOT EXISTS idx_feedback_worker_id ON feedback(worker_id);
        `;

        try {
            this.db.exec(schema);
            this.saveToStorage();
            console.log('✅ Database tables created successfully');
        } catch (error) {
            console.error('❌ Error creating tables:', error);
            throw error;
        }
    }

    // Insert sample data
    async insertSampleData() {
        const workers = this.getSampleWorkers();
        
        for (const worker of workers) {
            try {
                await this.addWorkerDirect(worker);
            } catch (error) {
                console.warn('⚠️ Sample worker already exists:', worker.name);
            }
        }
        this.saveToStorage();
    }

    // Get sample workers data
    getSampleWorkers() {
        return [
            {name: 'Ahmed Ali', age: 32, experience: 8, phone: '03001234567', category: 'plumber', city: 'Karachi', rating: 4.5, total_ratings: 12},
            {name: 'Hassan Khan', age: 28, experience: 5, phone: '03012345678', category: 'plumber', city: 'Lahore', rating: 4.2, total_ratings: 8},
            {name: 'Tariq Shah', age: 35, experience: 12, phone: '03123456789', category: 'plumber', city: 'Faisalabad', rating: 4.8, total_ratings: 15},
            {name: 'Khalil Rehman', age: 29, experience: 6, phone: '03456789012', category: 'welder', city: 'Karachi', rating: 4.4, total_ratings: 9},
            {name: 'Shahid Malik', age: 34, experience: 10, phone: '03567890123', category: 'welder', city: 'Lahore', rating: 4.7, total_ratings: 11},
            {name: 'Jameel Ahmad', age: 36, experience: 14, phone: '03901234567', category: 'carpenter', city: 'Karachi', rating: 4.9, total_ratings: 18},
            {name: 'Saleem Khan', age: 30, experience: 7, phone: '03012345679', category: 'carpenter', city: 'Lahore', rating: 4.4, total_ratings: 7}
        ];
    }

    // Get all workers by category and city
    async getWorkers(category, city) {
        try {
            if (this.isLocalStorage) {
                return this.db.workers.filter(w => w.category === category && w.city === city)
                    .sort((a, b) => b.rating - a.rating);
            }

            const stmt = this.db.prepare(`
                SELECT * FROM workers 
                WHERE category = ? AND city = ? 
                ORDER BY rating DESC, total_ratings DESC
            `);
            
            stmt.bind([category, city]);
            const workers = [];
            
            while (stmt.step()) {
                workers.push(stmt.getAsObject());
            }
            
            stmt.free();
            return workers;
        } catch (error) {
            console.error('❌ Error getting workers:', error);
            return [];
        }
    }

    // Add new worker (with duplicate check)
    async addWorker(workerData) {
        try {
            // Validate phone number uniqueness
            const existingWorker = await this.getWorkerByPhone(workerData.phone);
            if (existingWorker) {
                throw new Error('Phone number already registered');
            }

            return await this.addWorkerDirect(workerData);
        } catch (error) {
            console.error('❌ Error adding worker:', error);
            throw error;
        }
    }

    // Add worker directly (used for sample data)
    async addWorkerDirect(workerData) {
        try {
            if (this.isLocalStorage) {
                const newWorker = {
                    id: Date.now(),
                    ...workerData,
                    rating: workerData.rating || 0,
                    total_ratings: workerData.total_ratings || 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                this.db.workers.push(newWorker);
                this.saveToLocalStorage();
                return newWorker;
            }

            const stmt = this.db.prepare(`
                INSERT INTO workers (name, age, experience, phone, category, city, rating, total_ratings)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([
                workerData.name,
                workerData.age,
                workerData.experience,
                workerData.phone,
                workerData.category,
                workerData.city,
                workerData.rating || 0,
                workerData.total_ratings || 0
            ]);
            
            const result = this.db.exec("SELECT last_insert_rowid() as id");
            const insertId = result[0].values[0][0];
            stmt.free();
            
            this.saveToStorage();
            
            // Get the newly inserted worker
            return await this.getWorkerById(insertId);
        } catch (error) {
            console.error('❌ Error adding worker directly:', error);
            throw error;
        }
    }

    // Get worker by ID
    async getWorkerById(id) {
        try {
            if (this.isLocalStorage) {
                return this.db.workers.find(w => w.id == id) || null;
            }

            const stmt = this.db.prepare("SELECT * FROM workers WHERE id = ?");
            stmt.bind([id]);
            
            let worker = null;
            if (stmt.step()) {
                worker = stmt.getAsObject();
            }
            
            stmt.free();
            return worker;
        } catch (error) {
            console.error('❌ Error getting worker by ID:', error);
            return null;
        }
    }

    // Get worker by phone
    async getWorkerByPhone(phone) {
        try {
            if (this.isLocalStorage) {
                return this.db.workers.find(w => w.phone === phone) || null;
            }

            const stmt = this.db.prepare("SELECT * FROM workers WHERE phone = ?");
            stmt.bind([phone]);
            
            let worker = null;
            if (stmt.step()) {
                worker = stmt.getAsObject();
            }
            
            stmt.free();
            return worker;
        } catch (error) {
            console.error('❌ Error getting worker by phone:', error);
            return null;
        }
    }

    // Add feedback and update worker rating
    async addFeedback(workerId, rating, comment = '') {
        try {
            if (this.isLocalStorage) {
                const feedback = {
                    id: Date.now(),
                    worker_id: workerId,
                    rating: rating,
                    comment: comment,
                    created_at: new Date().toISOString()
                };
                
                this.db.feedback.push(feedback);
                
                // Update worker rating
                const workerFeedback = this.db.feedback.filter(f => f.worker_id == workerId);
                const avgRating = workerFeedback.reduce((sum, f) => sum + f.rating, 0) / workerFeedback.length;
                
                const worker = this.db.workers.find(w => w.id == workerId);
                if (worker) {
                    worker.rating = Math.round(avgRating * 10) / 10;
                    worker.total_ratings = workerFeedback.length;
                    worker.updated_at = new Date().toISOString();
                }
                
                this.saveToLocalStorage();
                return feedback;
            }

            const stmt = this.db.prepare(`
                INSERT INTO feedback (worker_id, rating, comment)
                VALUES (?, ?, ?)
            `);
            
            stmt.run([workerId, rating, comment]);
            stmt.free();
            
            // Update worker rating manually since triggers might not work
            await this.updateWorkerRating(workerId);
            this.saveToStorage();
            
            console.log('✅ Feedback added successfully');
            return true;
        } catch (error) {
            console.error('❌ Error adding feedback:', error);
            throw error;
        }
    }

    // Update worker rating manually
    async updateWorkerRating(workerId) {
        try {
            if (this.isLocalStorage) {
                return; // Already handled in addFeedback
            }

            // Calculate new rating
            const ratingResult = this.db.exec(`
                SELECT AVG(CAST(rating AS REAL)) as avg_rating, COUNT(*) as total
                FROM feedback 
                WHERE worker_id = ${workerId}
            `);

            if (ratingResult.length > 0 && ratingResult[0].values.length > 0) {
                const [avgRating, totalRatings] = ratingResult[0].values[0];
                
                const updateStmt = this.db.prepare(`
                    UPDATE workers 
                    SET rating = ?, total_ratings = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `);
                
                updateStmt.run([
                    Math.round((avgRating || 0) * 10) / 10,
                    totalRatings || 0,
                    workerId
                ]);
                
                updateStmt.free();
            }
        } catch (error) {
            console.error('❌ Error updating worker rating:', error);
        }
    }

    // Get worker feedback
    async getWorkerFeedback(workerId) {
        try {
            if (this.isLocalStorage) {
                return this.db.feedback.filter(f => f.worker_id == workerId)
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }

            const stmt = this.db.prepare(`
                SELECT * FROM feedback 
                WHERE worker_id = ? 
                ORDER BY created_at DESC
            `);
            
            stmt.bind([workerId]);
            const feedback = [];
            
            while (stmt.step()) {
                feedback.push(stmt.getAsObject());
            }
            
            stmt.free();
            return feedback;
        } catch (error) {
            console.error('❌ Error getting worker feedback:', error);
            return [];
        }
    }

    // Delete worker and associated feedback
    async deleteWorker(workerId) {
        try {
            if (this.isLocalStorage) {
                this.db.feedback = this.db.feedback.filter(f => f.worker_id != workerId);
                this.db.workers = this.db.workers.filter(w => w.id != workerId);
                this.saveToLocalStorage();
                return true;
            }

            // Explicitly delete feedback first, then worker
            const delFeedback = this.db.prepare("DELETE FROM feedback WHERE worker_id = ?");
            delFeedback.run([workerId]);
            delFeedback.free();

            const delWorker = this.db.prepare("DELETE FROM workers WHERE id = ?");
            delWorker.run([workerId]);
            delWorker.free();

            this.saveToStorage();
            console.log('✅ Worker deleted successfully');
            return true;
        } catch (error) {
            console.error('❌ Error deleting worker:', error);
            throw error;
        }
    }

    // Get all cities
    async getCities() {
        return [
            { name: 'Karachi', display_name: '🏙️ Karachi' },
            { name: 'Lahore', display_name: '🏛️ Lahore' },
            { name: 'Faisalabad', display_name: '🏢 Faisalabad' },
            { name: 'Rawalpindi', display_name: '🏗️ Rawalpindi' },
            { name: 'Sialkot', display_name: '🏭 Sialkot' }
        ];
    }

    // Get all categories
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
            if (this.isLocalStorage) {
                const totalWorkers = this.db.workers.length;
                const totalFeedback = this.db.feedback.length;
                const avgRating = totalWorkers > 0 ? 
                    this.db.workers.reduce((sum, w) => sum + w.rating, 0) / totalWorkers : 0;
                
                return {
                    totalWorkers,
                    totalFeedback,
                    avgRating: Math.round(avgRating * 10) / 10
                };
            }

            const result = this.db.exec(`
                SELECT 
                    COUNT(*) as total_workers,
                    AVG(rating) as avg_rating,
                    (SELECT COUNT(*) FROM feedback) as total_feedback
                FROM workers
            `);
            
            if (result.length > 0 && result[0].values.length > 0) {
                const [totalWorkers, avgRating, totalFeedback] = result[0].values[0];
                return {
                    totalWorkers: totalWorkers || 0,
                    avgRating: Math.round((avgRating || 0) * 10) / 10,
                    totalFeedback: totalFeedback || 0
                };
            }
            
            return { totalWorkers: 0, avgRating: 0, totalFeedback: 0 };
        } catch (error) {
            console.error('❌ Error getting statistics:', error);
            return { totalWorkers: 0, avgRating: 0, totalFeedback: 0 };
        }
    }

    // Export data for backup
    async exportData() {
        try {
            if (this.isLocalStorage) {
                return {
                    workers: this.db.workers,
                    feedback: this.db.feedback,
                    exported_at: new Date().toISOString(),
                    database_type: 'localStorage'
                };
            }

            const workers = this.db.exec("SELECT * FROM workers");
            const feedback = this.db.exec("SELECT * FROM feedback");
            
            return {
                workers: workers.length > 0 ? this.formatExportData(workers[0]) : [],
                feedback: feedback.length > 0 ? this.formatExportData(feedback[0]) : [],
                exported_at: new Date().toISOString(),
                database_type: 'SQLite'
            };
        } catch (error) {
            console.error('❌ Error exporting data:', error);
            throw error;
        }
    }

    // Format export data from SQLite result
    formatExportData(result) {
        if (!result.columns || !result.values) return [];
        
        return result.values.map(row => {
            const obj = {};
            result.columns.forEach((col, i) => {
                obj[col] = row[i];
            });
            return obj;
        });
    }

    // Close database connection
    async close() {
        try {
            if (this.db && !this.isLocalStorage) {
                this.saveToStorage();
                this.db.close();
            }
            this.isInitialized = false;
            console.log('✅ Database connection closed');
        } catch (error) {
            console.error('❌ Error closing database:', error);
        }
    }
}

// Export for use in main application (ES module) and attach to window for runtime access
export default WorkersDatabase;
if (typeof window !== 'undefined') {
    window.WorkersDatabase = WorkersDatabase;
}