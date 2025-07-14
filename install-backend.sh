#!/bin/bash

# NogaHub Backend Installation Script
echo "🚀 Installing NogaHub Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL is not installed. Please install MySQL first."
    exit 1
fi

# Navigate to backend directory
cd backend

# Install dependencies
echo "📦 Installing backend dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your database credentials."
    echo "📝 Edit backend/.env with your database settings before running the server."
fi

# Create database (optional)
echo "🗄️  Would you like to create the database now? (y/n)"
read -r create_db
if [ "$create_db" = "y" ]; then
    echo "Enter MySQL root password:"
    read -s mysql_password
    echo "Creating database..."
    mysql -u root -p"$mysql_password" < database.sql
    echo "✅ Database created successfully."
fi

echo "🎉 Backend installation complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your database credentials"
echo "2. Run 'npm run dev' in the backend directory to start the server"
echo "3. The backend will be available at http://localhost:5000"
echo ""
echo "Default admin credentials:"
echo "Email: admin@nogahub.com"
echo "Password: admin123"
echo ""
echo "⚠️  Remember to change the default admin password in production!"