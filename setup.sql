-- Local Workers Pakistan Database Schema
-- Run this file to set up the database: sqlite3 workers.db < setup.sql

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Create workers table
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

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- Create cities table for reference
CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL
);

-- Create categories table for reference
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    icon TEXT NOT NULL
);

-- Insert default cities
INSERT OR IGNORE INTO cities (name, display_name) VALUES 
('Karachi', '🏙️ Karachi'),
('Lahore', '🏛️ Lahore'),
('Faisalabad', '🏢 Faisalabad'),
('Rawalpindi', '🏗️ Rawalpindi'),
('Sialkot', '🏭 Sialkot');

-- Insert default categories
INSERT OR IGNORE INTO categories (name, display_name, icon) VALUES 
('plumber', 'Plumbers', '🔧'),
('welder', 'Welders', '⚡'),
('carpenter', 'Carpenters', '🔨');

-- Insert sample workers
INSERT OR IGNORE INTO workers (name, age, experience, phone, category, city, rating, total_ratings) VALUES 
('Ahmed Ali', 32, 8, '03001234567', 'plumber', 'Karachi', 4.5, 12),
('Hassan Khan', 28, 5, '03012345678', 'plumber', 'Lahore', 4.2, 8),
('Tariq Shah', 35, 12, '03123456789', 'plumber', 'Faisalabad', 4.8, 15),
('Khalil Rehman', 29, 6, '03456789012', 'welder', 'Karachi', 4.4, 9),
('Shahid Malik', 34, 10, '03567890123', 'welder', 'Lahore', 4.7, 11),
('Jameel Ahmad', 36, 14, '03901234567', 'carpenter', 'Karachi', 4.9, 18),
('Saleem Khan', 30, 7, '03012345679', 'carpenter', 'Lahore', 4.4, 7);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workers_category ON workers(category);
CREATE INDEX IF NOT EXISTS idx_workers_city ON workers(city);
CREATE INDEX IF NOT EXISTS idx_workers_rating ON workers(rating DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_worker_id ON feedback(worker_id);
CREATE INDEX IF NOT EXISTS idx_workers_phone ON workers(phone);

-- Create trigger to update worker rating when feedback is added
CREATE TRIGGER IF NOT EXISTS update_worker_rating
AFTER INSERT ON feedback
BEGIN
    UPDATE workers 
    SET 
        rating = (
            SELECT ROUND(AVG(CAST(rating AS REAL)), 1) 
            FROM feedback 
            WHERE worker_id = NEW.worker_id
        ),
        total_ratings = (
            SELECT COUNT(*) 
            FROM feedback 
            WHERE worker_id = NEW.worker_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.worker_id;
END;

-- Create trigger to update worker rating when feedback is deleted
CREATE TRIGGER IF NOT EXISTS update_worker_rating_on_delete
AFTER DELETE ON feedback
BEGIN
    UPDATE workers 
    SET 
        rating = COALESCE((
            SELECT ROUND(AVG(CAST(rating AS REAL)), 1) 
            FROM feedback 
            WHERE worker_id = OLD.worker_id
        ), 0.0),
        total_ratings = (
            SELECT COUNT(*) 
            FROM feedback 
            WHERE worker_id = OLD.worker_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.worker_id;
END;

-- Create views for easy data access
CREATE VIEW IF NOT EXISTS worker_details AS
SELECT 
    w.*,
    c.display_name as city_display,
    cat.display_name as category_display,
    cat.icon as category_icon
FROM workers w
JOIN cities c ON w.city = c.name
JOIN categories cat ON w.category = cat.name;

CREATE VIEW IF NOT EXISTS worker_feedback AS
SELECT 
    w.id,
    w.name,
    w.city,
    w.category,
    w.rating,
    w.total_ratings,
    f.rating as feedback_rating,
    f.comment as feedback_comment,
    f.created_at as feedback_date
FROM workers w
LEFT JOIN feedback f ON w.id = f.worker_id
ORDER BY w.rating DESC, f.created_at DESC;