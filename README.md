# 🔬 Lab Management System

A production-ready, full-stack laboratory management system for managing equipment inventory, bookings, users, and generating reports.

---

## 🚀 Quick Start (Single Command)

```bash
# 1. Clone the repository
git clone https://github.com/saurabhsrb23/Lab-Management-System.git
cd lab-management

# 2. Start everything
docker compose up --build
```

That's it. The system will:
1. Start PostgreSQL 15
2. Run Alembic migrations automatically
3. Seed the default admin user
4. Start the FastAPI backend
5. Build and start the Next.js frontend

| Service   | URL                         |
|-----------|-----------------------------|
| Frontend  | http://localhost:3000       |
| Backend   | http://localhost:8000       |
| API Docs  | http://localhost:8000/docs  |

**Default Admin Credentials:**
- Email: `admin@lab.com`
- Password: `Admin@123456`

---

## 🔐 Environment Variables

Copy and customize the `.env` file before deploying to production:

```env
POSTGRES_USER=labuser
POSTGRES_PASSWORD=labpassword123
POSTGRES_DB=labmanagement

# CHANGE THIS IN PRODUCTION:
SECRET_KEY=supersecretkey-change-this-in-production-use-openssl-rand-hex-32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

FIRST_ADMIN_EMAIL=admin@lab.com
FIRST_ADMIN_PASSWORD=Admin@123456

NEXT_PUBLIC_API_URL=http://localhost:8000
```

Generate a secure secret key:
```bash
openssl rand -hex 32
```

---

## 🏗️ Project Structure

```
lab-management/
├── docker-compose.yml          # Orchestrates all 3 services
├── .env                        # Environment variables
├── .gitignore
├── README.md
│
├── backend/                    # FastAPI application
│   ├── Dockerfile
│   ├── start.sh                # Runs migrations then starts uvicorn
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py              # Alembic configuration
│   │   └── versions/
│   │       └── 001_initial.py  # Database schema migration
│   └── app/
│       ├── main.py             # FastAPI app entry point, CORS, lifespan
│       ├── config.py           # Pydantic settings
│       ├── database.py         # Async SQLAlchemy engine & session
│       ├── models/
│       │   ├── user.py         # User ORM model
│       │   ├── equipment.py    # Equipment ORM model
│       │   └── booking.py      # Booking ORM model
│       ├── schemas/
│       │   ├── user.py         # Pydantic v2 user schemas
│       │   ├── equipment.py    # Pydantic v2 equipment schemas
│       │   └── booking.py      # Pydantic v2 booking schemas
│       ├── routers/
│       │   ├── auth.py         # POST /auth/login, /auth/register
│       │   ├── users.py        # CRUD /users
│       │   ├── equipment.py    # CRUD /equipment
│       │   ├── bookings.py     # CRUD /bookings + conflict detection
│       │   ├── dashboard.py    # Stats & charts data
│       │   └── reports.py      # Reports + CSV export
│       └── core/
│           ├── security.py     # JWT + bcrypt utilities
│           └── deps.py         # FastAPI dependency injection
│
└── frontend/                   # Next.js 14 application
    ├── Dockerfile              # Multi-stage production build
    ├── next.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    └── src/
        ├── app/
        │   ├── layout.tsx      # Root layout
        │   ├── page.tsx        # Redirect to dashboard/login
        │   ├── globals.css     # Tailwind + CSS variables
        │   ├── login/          # Login page
        │   ├── register/       # Register page
        │   ├── dashboard/      # Dashboard with charts
        │   ├── equipment/      # Equipment CRUD
        │   ├── bookings/       # Booking management
        │   ├── reports/        # Reports + CSV export
        │   └── users/          # User management (admin)
        ├── components/
        │   ├── ui/             # shadcn-style components
        │   └── layout/
        │       └── Sidebar.tsx # Navigation sidebar
        ├── lib/
        │   ├── api.ts          # Axios API client
        │   ├── auth.ts         # Cookie-based auth helpers
        │   └── utils.ts        # cn(), formatDate(), status colors
        └── types/
            └── index.ts        # TypeScript type definitions
```

---

## ✨ Features

### Authentication & Authorization
- JWT-based authentication with bcrypt password hashing
- Three roles: **Admin**, **Researcher**, **Student**
- Role-based access control on all routes
- Token stored in cookies, auto-refresh on 401

### Equipment Management
- Full CRUD for lab equipment
- Fields: name, category, description, quantity, available quantity, status, location
- Status tracking: available / maintenance / retired
- Category filtering and search

### Booking System
- Create bookings with date/time range and quantity
- **Conflict detection**: prevents overbooking by checking quantity availability per time slot
- Admin approve/reject workflow with notes
- Users can cancel their own pending bookings
- Status: pending → approved / rejected / cancelled

### Dashboard
- Real-time stats: total equipment, users, bookings by status
- Charts (Recharts): bookings by status (pie), monthly trends (bar), top equipment by usage (horizontal bar)

### Reports
- Filter bookings by date range and status
- Table view with all booking details
- **CSV export** with proper authentication

---

## 🔌 API Reference

Base URL: `http://localhost:8000/api/v1`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | Public |
| POST | `/auth/login` | Login, get JWT | Public |
| GET | `/users/me` | Current user profile | All |
| GET | `/users/` | List all users | Admin |
| PUT | `/users/{id}` | Update user | Admin/Self |
| GET | `/equipment/` | List equipment | All |
| POST | `/equipment/` | Create equipment | Admin |
| PUT | `/equipment/{id}` | Update equipment | Admin |
| DELETE | `/equipment/{id}` | Delete equipment | Admin |
| GET | `/bookings/` | List bookings | All (filtered by role) |
| POST | `/bookings/` | Create booking | All |
| PUT | `/bookings/{id}` | Update/Approve/Reject | Admin/Owner |
| GET | `/dashboard/stats` | Dashboard statistics | All |
| GET | `/dashboard/bookings-by-status` | Status breakdown | All |
| GET | `/dashboard/bookings-by-month` | Monthly trend | All |
| GET | `/dashboard/equipment-usage` | Usage ranking | All |
| GET | `/reports/bookings` | Booking report data | Admin/Researcher |
| GET | `/reports/bookings/export/csv` | CSV export | Admin/Researcher |

Interactive Swagger docs: **http://localhost:8000/docs**

---

## 🐋 Docker Services

| Service | Image | Port | Network |
|---------|-------|------|---------|
| postgres | postgres:15-alpine | 5432 | lab-network |
| backend | Custom (Python 3.11) | 8000 | lab-network |
| frontend | Custom (Node 20) | 3000 | lab-network |

- Frontend → Backend: `http://backend:8000` (inside Docker)
- Backend → DB: `postgres:5432` (inside Docker)
- External access via mapped ports

---

## 📤 GitHub Push Steps

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "feat: initial Lab Management System"

# Add remote and push
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

> **Security note**: The `.env` file is in `.gitignore`. Never commit it with real credentials. Use GitHub Secrets or a secrets manager for production deployments.

---

## 🛠 Development (Without Docker)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
# Set env vars or create .env
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Production Hardening Checklist

- [ ] Change `SECRET_KEY` to a cryptographically random value (`openssl rand -hex 32`)
- [ ] Change default admin password
- [ ] Use strong `POSTGRES_PASSWORD`
- [ ] Set `CORS allow_origins` to specific domains instead of `"*"`
- [ ] Add HTTPS via nginx reverse proxy
- [ ] Set `ACCESS_TOKEN_EXPIRE_MINUTES` to a shorter value (e.g., 60)
- [ ] Enable PostgreSQL SSL
- [ ] Set up database backups

---

## 📝 License

MIT
