Write-Host "Setting up LMS Database..." -ForegroundColor Green

# Set PostgreSQL password
$env:PGPASSWORD = "#keerthana18"

Write-Host "Creating database..." -ForegroundColor Yellow
try {
    createdb -U postgres lms_main
    Write-Host "✅ Database created successfully!" -ForegroundColor Green
    
    Write-Host "Running migrations..." -ForegroundColor Yellow
    npm run migrate
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migrations completed!" -ForegroundColor Green
        
        Write-Host "Seeding sample data..." -ForegroundColor Yellow
        npm run seed
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Sample data seeded!" -ForegroundColor Green
            Write-Host "🎉 Database setup complete!" -ForegroundColor Green
            Write-Host ""
            Write-Host "You can now start the backend server with:" -ForegroundColor Cyan
            Write-Host "npm run dev" -ForegroundColor White
        } else {
            Write-Host "❌ Seeding failed" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Migration failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Database creation failed" -ForegroundColor Red
    Write-Host "Please check your PostgreSQL installation and password" -ForegroundColor Yellow
}

Read-Host "Press Enter to continue"




