@echo off
echo Setting up LMS Database...

REM Set PostgreSQL password
set PGPASSWORD=#keerthana18

echo Creating database...
createdb lms_main

if %errorlevel% equ 0 (
    echo ✅ Database created successfully!
    echo Running migrations...
    npm run migrate
    
    if %errorlevel% equ 0 (
        echo ✅ Migrations completed!
        echo Seeding sample data...
        npm run seed
        
        if %errorlevel% equ 0 (
            echo ✅ Sample data seeded!
            echo 🎉 Database setup complete!
            echo.
            echo You can now start the backend server with:
            echo npm run dev
        ) else (
            echo ❌ Seeding failed
        )
    ) else (
        echo ❌ Migration failed
    )
) else (
    echo ❌ Database creation failed
    echo Please check your PostgreSQL installation and password
)

pause




