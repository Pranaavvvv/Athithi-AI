# Node.js PostgreSQL Authentication System

A secure authentication system built with Node.js, Express, PostgreSQL and Passport.js.

## Features

- User authentication (login/register)
- **Google OAuth 2.0 authentication**
- Password encryption with bcrypt
- Session-based authentication
- PostgreSQL database integration
- Docker containerization
- Protected route middleware
- JWT token authentication
- Input validation and sanitization

## Prerequisites

- Node.js v18 or higher
- Docker and Docker Compose
- PostgreSQL 15+

## Environment Variables

Create a `.env` file with:

```env
PORT=4100
NODE_ENV=development

# Database
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_DB=nodelogin

# JWT
JWT_SECRET=your_jwt_secret

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:3000

# Google OAuth (get from https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4100/auth/google/callback
```

## Setting up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Select **Web application** as the application type
6. Add authorized redirect URIs:
   - `http://localhost:4100/auth/google/callback` (development)
   - `https://your-domain.com/auth/google/callback` (production)
7. Copy the Client ID and Client Secret to your `.env` file
8. Enable the **Google+ API** or **People API** in the API Library

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Run the database migration for Google OAuth:
```bash
psql -U your_user -d your_database -f migrations/001_add_google_oauth.sql
```

## Running with Docker

Start all services:
```bash
docker-compose up --build
```

Services:
- PostgreSQL on port 5432
- Node.js app on port 4100

## Running Locally

1. Start PostgreSQL service
2. Create database tables:
```sql
CREATE DATABASE nodelogin;
\c nodelogin

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(200),
  email VARCHAR(200) UNIQUE,
  password VARCHAR(200),
  google_id VARCHAR(255) UNIQUE,
  avatar TEXT,
  auth_provider VARCHAR(50) DEFAULT 'local',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_google_id ON users(google_id);
```
3. Run the server:
```bash
npm start
# or for development with auto-reload
npm run dev
```

## API Endpoints

### Authentication (Local)
- `POST /users/register` - Register new user
- `POST /users/login` - User login
- `GET /users/logout` - Logout user

### Google OAuth
- `GET /auth/google` - Initiate Google OAuth login
- `GET /auth/google/callback` - Google OAuth callback (handled automatically)
- `GET /auth/status` - Check authentication status

### Protected Routes
- `GET /users/dashboard` - User dashboard (requires authentication)

## Tech Stack

- Express.js - Web framework
- PostgreSQL - Database
- node-postgres (pg) - PostgreSQL client
- Passport.js - Authentication
- passport-google-oauth20 - Google OAuth 2.0 strategy
- jsonwebtoken - JWT implementation
- bcrypt - Password hashing
- cors - CORS middleware
- dotenv - Environment configuration

## Project Structure

```
.
├── config/
│   └── db.js
├── middleware/
│   ├── authorization.js
│   └── validInfo.js
├── routes/
│   ├── auth.js
│   ├── dashboard.js
│   └── users.js
├── database.sql
├── index.js
├── docker-compose.yml
├── .env.example
└── package.json
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

## License

[MIT](https://choosealicense.com/licenses/mit/)