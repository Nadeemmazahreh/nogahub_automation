# NogaHub Backend API

A secure Node.js/Express backend API for the NogaHub Automation system with JWT authentication, role-based access control, and MySQL database.

## 🚀 Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Admin and User roles with different permissions
- **Secure Equipment Database**: Protected pricing data with role-based visibility
- **Project Management**: Save, load, and manage projects with user isolation
- **Rate Limiting**: Protection against API abuse
- **Input Validation**: Comprehensive request validation with Joi
- **Database Security**: Parameterized queries and proper data sanitization
- **CORS Protection**: Configured for frontend integration

## 📁 Project Structure

```
backend/
├── server.js              # Main application entry point
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
├── middleware/
│   └── auth.js           # Authentication and authorization middleware
├── models/
│   └── database.js       # Database models and configuration
├── routes/
│   ├── auth.js           # Authentication routes
│   ├── equipment.js      # Equipment management routes
│   └── projects.js       # Project management routes
└── README.md             # This file
```

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=nogahub_db
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   JWT_SECRET=your-super-secret-jwt-key
   PORT=5000
   ```

3. **Set up MySQL database:**
   ```sql
   CREATE DATABASE nogahub_db;
   CREATE USER 'your_db_user'@'localhost' IDENTIFIED BY 'your_db_password';
   GRANT ALL PRIVILEGES ON nogahub_db.* TO 'your_db_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

4. **Start the server:**
   ```bash
   npm run dev  # Development mode with nodemon
   # or
   npm start    # Production mode
   ```

## 🔐 Security Features

### Authentication
- JWT tokens with configurable expiration
- Password hashing with bcrypt (12 rounds)
- Token refresh mechanism
- Secure logout handling

### Authorization
- Role-based access control (admin/user)
- Route-level permissions
- Resource-level user isolation

### API Security
- Rate limiting (100 requests per 15 minutes)
- CORS configuration
- Helmet.js security headers
- Input validation and sanitization
- API key support for additional security

### Database Security
- Parameterized queries (Sequelize ORM)
- Role-based data filtering
- Soft deletes for audit trails
- Connection pooling

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout user

### Equipment
- `GET /api/equipment` - Get equipment list (role-based pricing)
- `GET /api/equipment/:id` - Get single equipment item
- `POST /api/equipment` - Create equipment (admin only)
- `PUT /api/equipment/:id` - Update equipment (admin only)
- `DELETE /api/equipment/:id` - Delete equipment (admin only)
- `GET /api/equipment/categories/list` - Get equipment categories

### Projects
- `GET /api/projects` - Get user's projects
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/stats/summary` - Get project statistics

## 🔑 Role Permissions

### Admin Role
- Full access to all equipment data (dealer + client prices)
- Create, update, delete equipment
- Manage all system resources
- Access to system statistics

### User Role
- Access to client pricing only
- Create and manage own projects
- View equipment catalog
- Limited system access

## 📊 Database Schema

### Users
- `id` - Primary key
- `username` - Unique username
- `email` - Unique email address
- `password` - Hashed password
- `role` - User role (admin/user)
- `isActive` - Account status

### Equipment
- `id` - Primary key
- `code` - Unique equipment code
- `name` - Equipment name
- `dealerUSD` - Dealer price (admin only)
- `clientUSD` - Client price
- `weight` - Equipment weight
- `category` - Equipment category
- `isActive` - Equipment status

### Projects
- `id` - Primary key
- `projectName` - Project name
- `clientName` - Client name
- `userId` - Owner user ID
- `equipment` - JSON array of equipment
- `globalDiscount` - Discount percentage
- `services` - JSON object of services
- `customServices` - JSON array of custom services
- `customEquipment` - JSON array of custom equipment
- `roles` - JSON object of project roles
- `total` - Project total amount
- `isCalculated` - Calculation status
- `calculationResults` - JSON calculation results

## 🧪 Testing

Run tests with:
```bash
npm test
```

## 📝 Environment Variables

Required environment variables:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nogahub_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Server
PORT=5000
NODE_ENV=development

# Security
FRONTEND_URL=http://localhost:3000
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
API_KEY=your-api-key
```

## 🚀 Deployment

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Configure proper database credentials
4. Set up SSL/TLS
5. Configure firewall rules
6. Set up monitoring and logging
7. Use a process manager (PM2)

## 📞 Support

For issues and questions, please check the documentation or contact the development team.