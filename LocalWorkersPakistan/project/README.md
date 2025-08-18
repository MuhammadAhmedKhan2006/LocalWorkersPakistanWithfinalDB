# Local Workers Pakistan - SQLite Powered 🔧

A modern, SQLite-powered platform to connect customers with skilled local workers in Pakistan.

## 🚀 Features

- **SQLite Database Integration** - Robust data storage with SQL.js
- **Worker Registration** - Complete worker profiles with validation
- **Rating & Feedback System** - Customer reviews stored in database
- **Real-time Search** - Filter by city and service category
- **Mobile Responsive** - Works perfectly on all devices
- **Offline Capable** - Fallback to localStorage when needed
- **Data Export** - Backup your data anytime
- **3D UI Effects** - Modern glassmorphism design

## 📋 Prerequisites

Before running the application, ensure you have:

1. **SQLite3 installed** at: `C:\Users\LAPTOP LAB\Downloads\sqlite3`
2. **Node.js** (version 16 or higher)
3. **Web browser** with modern JavaScript support

## 🛠️ Installation & Setup

### 1. Clone/Download Files
Download all the provided files to your project directory:
```
local-workers-pakistan/
├── index.html
├── main.js
├── database.js
├── style.css
├── setup.sql
├── package.json
└── README.md
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup SQLite Database
Run the following commands in your project directory:

```bash
# Navigate to your SQLite installation
cd "C:\Users\LAPTOP LAB\Downloads\sqlite3"

# Create and initialize database
sqlite3 "C:\path\to\your\project\workers.db" < "C:\path\to\your\project\setup.sql"
```

**Alternative method** (if the above doesn't work):
```bash
# Create database file
sqlite3 workers.db

# Inside SQLite prompt, run:
.read setup.sql
.quit
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Open Application
Navigate to `http://localhost:5173` in your browser.

## 🗄️ Database Schema

The application uses the following SQLite tables:

### Workers Table
```sql
CREATE TABLE workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER CHECK (age >= 18 AND age <= 70),
    experience INTEGER CHECK (experience >= 0 AND experience <= 50),
    phone TEXT UNIQUE CHECK (length(phone) = 11 AND phone GLOB '03[0-9]*'),
    category TEXT CHECK (category IN ('plumber', 'welder', 'carpenter')),
    city TEXT CHECK (city IN ('Karachi', 'Lahore', 'Faisalabad', 'Rawalpindi', 'Sialkot')),
    rating REAL DEFAULT 0.0,
    total_ratings INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Feedback Table
```sql
CREATE TABLE feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);
```

## 🎯 How to Use

### For Customers:
1. **Select City** - Choose your location from the dropdown
2. **Browse Services** - Click on Plumbers, Welders, or Carpenters
3. **View Workers** - See available workers with ratings
4. **Contact Worker** - Click on a worker card to see details and phone number
5. **Rate Service** - After using a service, rate your experience

### For Workers:
1. **Register** - Click "+ Add Yourself" button
2. **Fill Details** - Complete the registration form
3. **Get Listed** - Your profile appears in search results
4. **Receive Calls** - Customers can contact you directly

## 📱 Mobile Usage

The application is fully mobile-responsive:
- Touch-optimized interface
- Swipe gestures supported
- Prevents zoom on form inputs
- Works offline with localStorage fallback

## 🔧 Database Operations

### Manual Database Commands

**View all workers:**
```bash
sqlite3 workers.db "SELECT * FROM workers;"
```

**View workers by category:**
```bash
sqlite3 workers.db "SELECT * FROM workers WHERE category='plumber';"
```

**View feedback:**
```bash
sqlite3 workers.db "SELECT * FROM feedback;"
```

**Backup database:**
```bash
sqlite3 workers.db ".backup workers_backup_$(date +%Y%m%d).db"
```

**Export to CSV:**
```bash
sqlite3 workers.db -header -csv "SELECT * FROM workers;" > workers.csv
```

## 🛡️ Data Validation

The application includes comprehensive validation:

- **Phone numbers** - Must be 11 digits starting with "03"
- **Age limits** - Between 18-70 years
- **Experience** - 0-50 years maximum
- **Unique constraints** - No duplicate phone numbers
- **Required fields** - All fields mandatory for registration

## 🔄 Fallback System

If SQLite fails to load, the application automatically:
1. Falls back to localStorage
2. Maintains all functionality
3. Shows notification about offline mode
4. Data persists between sessions

## 📦 Building for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

The built files will be in the `dist/` directory.

## 🚀 Deployment Options

### 1. Local Network Deployment
```bash
npm run serve
```
Access from any device on your network at `http://your-ip:3000`

### 2. Static File Hosting
Upload the `dist/` folder contents to any web server:
- GitHub Pages
- Netlify
- Vercel
- Apache/Nginx server

### 3. Desktop App (Optional)
Use Electron to create a desktop application:
```bash
npm install electron --save-dev
# Configure electron and build
```

## 🐛 Troubleshooting

### SQLite Not Loading
**Error:** Database initialization failed
**Solution:** 
1. Check if SQLite is properly installed
2. Verify file paths in database.js
3. Application will fallback to localStorage automatically

### Phone Validation Errors
**Error:** Invalid phone format
**Solution:** Ensure phone numbers:
- Are exactly 11 digits
- Start with "03"
- Contain only numbers

### Mobile Zoom Issues
**Solution:** The app includes `user-scalable=no` to prevent zoom

### Performance Issues
**Solution:** 
- The app uses efficient SQLite queries
- Indexes are created for fast searches
- Large datasets are paginated automatically

## 📊 Database Statistics

Access real-time statistics:
```javascript
// In browser console
db.getStatistics().then(stats => console.log(stats));
```

Returns:
- Total workers registered
- Average rating across all workers
- Total feedback entries

## 🔐 Security Features

- **SQL Injection Protection** - Parameterized queries
- **Input Validation** - Client and database-level validation
- **Data Sanitization** - All inputs are cleaned
- **Unique Constraints** - Prevents duplicate registrations

## 📈 Future Enhancements

Planned features:
- [ ] Worker availability scheduling
- [ ] Service request system
- [ ] Push notifications
- [ ] Advanced search filters
- [ ] Worker portfolio uploads
- [ ] Payment integration
- [ ] Multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support and questions:
- **Email:** support@localworkerspakistan.com
- **GitHub Issues:** Create an issue for bugs
- **Documentation:** Check this README for common solutions

## 🙏 Acknowledgments

- **SQL.js** - SQLite compiled to JavaScript
- **Vite** - Fast development server
- **Modern CSS** - Glassmorphism effects
- **Pakistani Workers** - The inspiration for this platform

---

**Ready to connect Pakistan's skilled workforce! 🇵🇰**