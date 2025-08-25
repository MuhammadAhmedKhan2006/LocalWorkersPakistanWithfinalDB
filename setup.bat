@echo off
echo ================================
echo Local Workers Pakistan - SQLite Setup
echo ================================
echo.

REM Set variables
set SQLITE_PATH=C:\Users\LAPTOP LAB\Downloads\sqlite3
set PROJECT_DIR=%cd%
set DB_FILE=%PROJECT_DIR%\workers.db

echo Current directory: %PROJECT_DIR%
echo SQLite path: %SQLITE_PATH%
echo Database file: %DB_FILE%
echo.

REM Check if SQLite exists
if not exist "%SQLITE_PATH%\sqlite3.exe" (
    echo ERROR: SQLite not found at %SQLITE_PATH%
    echo Please ensure SQLite is installed at the correct location.
    pause
    exit /b 1
)

echo ✅ SQLite found at %SQLITE_PATH%

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Check if npm is available
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm not found. Please install npm.
    pause
    exit /b 1
)

echo ✅ npm found
npm --version
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed successfully
echo.

REM Remove existing database if it exists
if exist "%DB_FILE%" (
    echo 🗑️ Removing existing database...
    del "%DB_FILE%"
)

REM Create database using SQLite
echo 🗄️ Creating SQLite database...
if not exist "setup.sql" (
    echo ERROR: setup.sql file not found in current directory
    echo Please ensure all files are in the same directory
    pause
    exit /b 1
)

REM Use SQLite to create and initialize database
"%SQLITE_PATH%\sqlite3.exe" "%DB_FILE%" < setup.sql
if errorlevel 1 (
    echo ERROR: Failed to create database
    pause
    exit /b 1
)

echo ✅ Database created successfully
echo.

REM Verify database creation
if not exist "%DB_FILE%" (
    echo ERROR: Database file was not created
    pause
    exit /b 1
)

REM Check database contents
echo 🔍 Verifying database contents...
"%SQLITE_PATH%\sqlite3.exe" "%DB_FILE%" "SELECT COUNT(*) as worker_count FROM workers;"
if errorlevel 1 (
    echo WARNING: Could not verify database contents
) else (
    echo ✅ Database verification successful
)
echo.

REM Create a simple test script
echo @echo off > test_db.bat
echo "%SQLITE_PATH%\sqlite3.exe" "%DB_FILE%" %%* >> test_db.bat
echo Created test_db.bat for easy database access
echo.

echo 🎉 Setup completed successfully!
echo.
echo Next steps:
echo 1. Run: npm run dev
echo 2. Open: http://localhost:5173
echo 3. Test the application
echo.
echo Additional commands:
echo - View database: test_db.bat
echo - Reset database: npm run reset-db
echo - Backup database: npm run backup-db
echo.

REM Ask if user wants to start development server
set /p START_DEV=Start development server now? (y/n): 
if /i "%START_DEV%"=="y" (
    echo.
    echo 🚀 Starting development server...
    echo Open http://localhost:5173 in your browser
    echo Press Ctrl+C to stop the server
    echo.
    call npm run dev
) else (
    echo.
    echo To start development server later, run: npm run dev
    echo.
)

pause