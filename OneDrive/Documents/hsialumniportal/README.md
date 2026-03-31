# HSI Alumni Portal

A full-stack alumni management application with separate frontend and backend folders.

## Project Structure

```
hsialumniportal/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/
│   │   ├── config/
│   │   │   └── api.js       # Centralized API configuration
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── ...
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env                 # Frontend environment variables
│   └── .env.example
│
├── backend/                  # Express backend server
│   ├── server.js
│   ├── package.json
│   ├── routes/
│   ├── models/
│   ├── services/
│   └── ...
│
├── package.json             # Root package.json with shared scripts
├── .gitignore
└── README.md
```

## Quick Start

### Install Dependencies

```bash
# Install all dependencies (root, backend, and frontend)
npm run install-all
```

### Development

```bash
# Run both frontend and backend concurrently
npm run dev

# Or run them separately
npm run backend      # Terminal 1 - Backend runs on http://localhost:5000
npm run frontend     # Terminal 2 - Frontend runs on http://localhost:5173
```

### Build

```bash
# Build the frontend
npm run build
```

### Start Production

```bash
# Start the backend server
npm start
```

## Environment Variables

### Frontend (.env)

Create a `.env` file in the `frontend/` directory:

```
VITE_API_URL=http://localhost:5000
```

For production, update this to your backend URL.

## API Configuration

The frontend uses a centralized API configuration file (`frontend/src/config/api.js`) that automatically reads the API URL from environment variables. This means you can easily switch between development and production environments without modifying component code.

### Example Usage in Components

```javascript
import { apiEndpoints } from './config/api';

const response = await fetch(apiEndpoints.login, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
```

## API Endpoints Reference

All endpoints are defined in `frontend/src/config/api.js`:

- **Authentication**: `/api/auth/google`, `/api/auth/login`, `/api/auth/forgot-password`, etc.
- **Registration**: `/api/register/send-otp`, `/api/register/verify-otp`
- **Admin**: `/api/admin/all-users`, `/api/admin/pending-users`, `/api/admin/stats`, etc.

## Technology Stack

### Frontend
- React 19
- React Router 7
- Vite 7
- Tailwind CSS
- Framer Motion
- Heroicons

### Backend
- Express 5
- MongoDB with Mongoose
- JWT Authentication
- Nodemailer
- CORS

## Notes

- The root `package.json` includes scripts for managing both frontend and backend from one place
- Use `concurrently` to run both servers in parallel during development
- Environment variables are gitignored for security
- The `.env.example` file documents available configuration options
