# TAPS - Transcript Automation and Processing Service

A modern, enterprise-grade web application for managing transcript requests with role-based access control, Azure AD authentication, and SharePoint integration.

## Features

- **Azure AD Authentication** - Secure Microsoft 365 login
- **Role-Based Access Control** - 7 distinct user roles (Student, Library, Bursar, Academic, Verifier, Processor, Admin)
- **SharePoint Integration** - Secure file storage via Microsoft Graph API
- **Power Automate Integration** - Automated webhook triggers at each stage
- **Modern UI** - Microsoft 365-style interface with TailwindCSS and shadcn/ui
- **Real-time Updates** - React Query for efficient data fetching and caching
- **Audit Trail** - Complete history log for all actions

## Tech Stack

### Frontend
- React 18 + TypeScript
- TailwindCSS + shadcn/ui components
- React Router for navigation
- React Query for data management
- MSAL (Microsoft Authentication Library)
- Vite for build tooling

### Backend
- Node.js + Express
- PostgreSQL + Prisma ORM
- Azure AD (MSAL Node)
- Microsoft Graph API (SharePoint)
- Power Automate webhooks

## Prerequisites

- Node.js 18+ (Node 20 recommended)
- PostgreSQL 14+
- Azure AD App Registration
- SharePoint site (optional for development)

## Setup Instructions

### 1. Clone and Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb taps_db

# Run migrations
cd backend
npm run db:migrate

# Generate Prisma Client
npm run db:generate

# (Optional) Seed sample data
npm run db:seed
```

### 3. Environment Configuration

Copy and configure environment files:

```bash
# Backend
cp .env.example .env
# Edit .env with your Azure AD and database credentials

# Frontend
cd frontend
cp .env.example .env
# Edit .env with your Azure AD client ID and tenant ID
```

### 4. Azure AD Configuration

1. Create an App Registration in Azure Portal
2. Configure authentication:
   - Platform: Single-page application
   - Redirect URI: `http://localhost:5173`
3. Create a client secret
4. Add API permissions:
   - Microsoft Graph: `User.Read`
   - SharePoint: `Files.ReadWrite.All` (if using SharePoint)

### 5. Run Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Visit `http://localhost:5173` to access the application.

## Project Structure

```
├── backend/
│   ├── lib/           # Utilities (Prisma, MSAL, SharePoint, etc.)
│   ├── middleware/    # Auth middleware
│   ├── routes/        # API routes
│   └── server.js      # Express server
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/    # Sidebar, Header, Layout
│   │   │   └── ui/        # shadcn/ui components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API client
│   │   └── lib/           # Utilities
│   └── ...
└── prisma/
    └── schema.prisma     # Database schema
```

## User Roles

- **STUDENT** - Submit and view own requests
- **LIBRARY** - Review library-related requests
- **BURSAR** - Review bursar-related requests
- **ACADEMIC** - Review academic-related requests
- **VERIFIER** - Verify and add notes to requests
- **PROCESSOR** - Process approved requests
- **ADMIN** - Manage users and system settings

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with Azure AD
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Requests
- `GET /api/requests` - Get all requests (role-filtered)
- `GET /api/requests/my` - Get current user's requests
- `GET /api/requests/:id` - Get single request
- `POST /api/requests` - Create new request
- `PATCH /api/requests/:id` - Update request

### Admin
- `GET /api/admin/users` - Get all users
- `PATCH /api/admin/users/:id/role` - Update user role
- `GET /api/admin/stats` - Get system statistics

## Deployment

### Azure App Service

1. Build frontend:
```bash
cd frontend
npm run build
```

2. Deploy backend to Azure App Service
3. Configure Azure PostgreSQL
4. Set environment variables in App Service
5. Run migrations:
```bash
npm run db:migrate
```

### Docker

```bash
docker-compose up --build
```

## Development

### Database Migrations

```bash
# Create migration
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

### Testing

```bash
# Run tests (when implemented)
npm test
```

## License

Proprietary - COSTAATT

## Support

For issues or questions, contact the development team.
