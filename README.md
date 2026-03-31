# 🚀 Platforma

**Unified Food Delivery & Event Management Platform**

Platforma combines **Zesty** (food delivery) and **Eventra** (event & ticketing) into a single web app with an animated mode switcher.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 · TypeScript · Tailwind CSS v4 · Framer Motion |
| Backend | Django 4.2 · Django REST Framework · PostgreSQL |
| Auth | JWT (SimpleJWT) |
| Payments | Simulated (no real integration) |

## Quick Start

### 1. Environment
```bash
cp .env.example .env
# Edit .env — add DATABASE_URL for PostgreSQL, or leave empty for SQLite
```

### 2. Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Open
- Frontend: http://localhost:3000
- API: http://localhost:8000/api/v1/
- Admin: http://localhost:8000/admin/

## Project Structure

```
Platforma/
├── backend/           # Django REST API
│   ├── config/        # Settings, URLs
│   ├── core/          # Auth, Users, Payments
│   ├── zesty/         # Food delivery
│   ├── eventra/       # Event management
│   └── utils/         # Shared utilities
├── frontend/          # Next.js App
│   └── src/
│       ├── app/       # Pages (App Router)
│       ├── components/# React components
│       ├── context/   # State providers
│       └── styles/    # Theme system
└── Plans/             # Design docs
```
