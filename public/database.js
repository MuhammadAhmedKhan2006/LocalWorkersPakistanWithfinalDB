// database.js
// WorkersDatabase with SQLite persistence using IndexedDB (via localForage)

import localforage from "https://cdn.jsdelivr.net/npm/localforage/dist/localforage.min.js";

class WorkersDatabase {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.workers = [];
        this.feedback = [];
    }

    async init() {
        try {
            console.log('🔄 Initializing database...');

            // Always load from localStorage first (reliable fallback)
            this.loadFromLocalStorage();

            // Try to enhance with SQLite + IndexedDB persistence
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
            this.workers = this.getSampleWorkers();
            this.feedback = [];
            this.saveToLocalStorage();
            this.isInitialized = true;
            return false;
        }
    }

    loadFromLocalStorage() {
        try {
            const savedWorkers = localStorage.getItem('local_workers_db');
            const savedFeedback = localStorage.getItem('local_feedback_db');

            if (savedWorkers) {
                this.workers = JSON.parse(savedWorkers);
                console.log('✅ Loaded', this.workers.length, 'workers from localStorage');
            } else {
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

    saveToLocalStorage() {
        try {
            localStorage.setItem('local_workers_db', JSON.stringify(this.workers));
            localStorage.setItem('local_feedback_db', JSON.stringify(this.feedback));
            localStorage.setItem('db_last_updated', new Date().toISOString());
        } catch (error) {
            console.error('❌ Error saving to localStorage:', error);
        }
    }

    // --- NEW: Save/load SQLite from IndexedDB ---
    async saveSqlite() {
        if (!this.db) return;
        try {
            const data = this.db.export(); // Uint8Array
            await localforage.setItem("workers_sqlite_db", data);
            console.log("💾 SQLite saved to IndexedDB");
        } catch (e) {
            console.error("❌ Failed to save SQLite:", e);
        }
    }

    async loadSqlite(SQL) {
        try {
            const savedDb = await localforage.getItem("workers_sqlite_db");
            if (savedDb) {
                console.log("📦 Restoring SQLite from IndexedDB");
                return new SQL.Database(new Uint8Array(savedDb));
            }
        } catch (e) {
            console.warn("⚠ Could not load SQLite from IndexedDB:", e);
        }
        return new SQL.Database(); // new empty DB
    }

    async enhanceWithSqlite() {
        try {
            const SQL = await window.initSqlJs({
                locateFile: file => `https://sql.js.org/dist/${file}`
            });

            this.db = await this.loadSqlite(SQL);
            await this.createSqliteTables();

            // Sync existing data to SQLite
            for (const worker of this.workers) {
                await this.addWorkerToSqlite(worker);
            }

            // Save immediately
            await this.saveSqlite();

            console.log('✅ SQLite enhancement active with persistence');
        } catch (error) {
            console.warn('⚠ SQLite enhancement failed, continuing with localStorage:', error);
            this.db = null;
        }
    }

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
            await this.saveSqlite();
        } catch (error) {
            console.warn('⚠ SQLite sync failed for worker:', worker.name);
        }
    }

    async addWorker(workerData) {
        const existingWorker = this.workers.find(w => w.phone === workerData.phone);
        if (existingWorker) {
            throw new Error('Phone number already registered');
        }

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

        this.workers.push(newWorker);
        this.saveToLocalStorage();

        if (this.db) {
            await this.addWorkerToSqlite(newWorker);
        }

        return newWorker;
    }

    async addFeedback(workerId, rating, comment = '') {
        const newFeedback = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            worker_id: parseInt(workerId),
            rating: parseInt(rating),
            comment: comment.trim(),
            created_at: new Date().toISOString()
        };

        this.feedback.push(newFeedback);

        const worker = this.workers.find(w => w.id == workerId);
        if (worker) {
            const workerFeedback = this.feedback.filter(f => f.worker_id == workerId);
            const avgRating = workerFeedback.reduce((s, f) => s + f.rating, 0) / workerFeedback.length;

            worker.rating = Math.round(avgRating * 10) / 10;
            worker.total_ratings = workerFeedback.length;
            worker.updated_at = new Date().toISOString();
        }

        this.saveToLocalStorage();
        if (this.db) await this.saveSqlite();

        return newFeedback;
    }

    async deleteWorker(workerId) {
        this.workers = this.workers.filter(w => w.id != workerId);
        this.feedback = this.feedback.filter(f => f.worker_id != workerId);

        this.saveToLocalStorage();
        if (this.db) await this.saveSqlite();
    }

    async forceSave() {
        this.saveToLocalStorage();
        if (this.db) await this.saveSqlite();
        return true;
    }

    async close() {
        await this.forceSave();
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    // --- the rest of your methods (getWorkers, getCities, etc.) stay unchanged ---
}

export default WorkersDatabase;
if (typeof window !== 'undefined') {
    window.WorkersDatabase = WorkersDatabase;
}
