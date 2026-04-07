# Platforma

Unified Food Delivery and Event Management platform.

Platforma combines:
- Zesty: food ordering and restaurant operations
- Eventra: event discovery, seat selection, booking, ticketing

It includes role-based authentication, owner/organizer dashboards, customer workflows, notifications, and ticket generation flows.

## Table of Contents

- Overview
- Core Features
- Architecture
- Tech Stack
- Repository Layout
- Local Development Setup
- Environment Variables
- Run Commands
- Seed Data and Demo Accounts
- API Overview
- Role and Permission Model
- Dynamic Update Behavior
- Testing
- Troubleshooting
- Notes for Contributors

## Overview

Platforma is a monorepo with:
- Backend: Django + Django REST Framework API
- Frontend: React + TypeScript + Vite

The backend exposes versioned APIs under /api/v1 and provides JWT-based auth.
The frontend consumes these APIs and provides:
- Customer experiences for food and event booking
- Restaurant owner dashboard
- Event organizer dashboard

## Core Features

### Authentication and Accounts

- Email/password authentication via JWT (SimpleJWT)
- Role-based users:
	- customer
	- restaurant_owner
	- event_organizer
	- delivery_partner
	- admin
- Role-specific registration metadata:
	- restaurant_name for restaurant owners
	- company_name for event organizers
- Profile, addresses, password change, logout

### Zesty (Food Delivery)

- Restaurant discovery and detail pages
- Menu browsing
- Cart and checkout
- Order placement and tracking
- Order history/details
- Restaurant owner dashboard for:
	- restaurant CRUD
	- menu CRUD
	- incoming orders and status updates
	- analytics

### Eventra (Events and Ticketing)

- Event discovery and landing experiences
- Event details and seat/zone selection
- Booking checkout
- Booking history/details
- Ticket display with QR and PDF download support
- Event organizer dashboard for:
	- event CRUD and publish/cancel actions
	- ticket type management
	- seat management (including bulk create)
	- booking visibility and analytics

### Shared Platform Features

- Notifications for customer and owner/organizer flows
- Global search endpoint
- Simulated payments
- Pagination, filtering, and sorting support

## Architecture

### Backend (Django)

- config: Django project settings and URL composition
- core: auth, user profile, addresses, payments, notifications, search
- zesty: restaurant and order domain
- eventra: event, ticket, seat, booking domain
- restaurants: legacy discovery endpoints under /api
- utils: shared pagination and exception handlers

### Frontend (React + Vite)

Located in frontend/zesty-app:
- Router-based SPA
- Context-driven state management (auth/cart/booking/notifications)
- Role-guarded routes for owner/organizer dashboards
- API layer with axios and token refresh behavior

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router |
| Backend | Django 4.2, DRF, django-filter, django-cors-headers |
| Auth | JWT (djangorestframework-simplejwt) |
| DB | SQLite (default in current settings) |
| Imaging | Pillow |
| Ticket/PDF on frontend | qrcode, jspdf |

## Repository Layout

```text
Platforma/
	backend/
		config/
		core/
		zesty/
		eventra/
		restaurants/
		utils/
		manage.py
		requirements.txt

	frontend/
		zesty-app/
			src/
			package.json

	Plans/
	README.md
	.env.example
```

## Local Development Setup

### Prerequisites

- Python 3.11+
- Node.js 20+ (recommended)
- npm 10+

### 1) Clone and enter repo

```powershell
git clone <your-repo-url>
cd Platforma
```

### 2) Backend setup

From repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
python backend\manage.py migrate
python backend\manage.py createsuperuser
python backend\manage.py runserver 127.0.0.1:8000
```

Alternative if you are already in backend/:

```powershell
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

### 3) Frontend setup

```powershell
cd frontend\zesty-app
npm install
npm run dev
```

### 4) Access URLs

- Frontend app: http://localhost:5173
- Backend API: http://localhost:8000/api/v1/
- Django Admin: http://localhost:8000/admin/

## Environment Variables

### Backend (.env at repo root)

Copy template:

```powershell
copy .env.example .env
```

Important variables used by backend settings include:
- DJANGO_SECRET_KEY
- DJANGO_DEBUG
- DJANGO_ALLOWED_HOSTS
- JWT_ACCESS_TOKEN_LIFETIME_MINUTES
- JWT_REFRESH_TOKEN_LIFETIME_DAYS
- CORS_ALLOWED_ORIGINS
- EMAIL_BACKEND
- DEFAULT_FROM_EMAIL

Note:
- Current backend DB setting is SQLite in config/settings.py by default.
- DATABASE_URL is present in template but not wired into current settings logic.

### Frontend (frontend/zesty-app/.env)

Set API base if needed:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

The frontend client normalizes values ending with /api to /api/v1 for backward compatibility.

## Run Commands

### Backend

```powershell
python backend\manage.py check
python backend\manage.py migrate
python backend\manage.py test core zesty eventra
```

### Frontend

```powershell
cd frontend\zesty-app
npm run dev
npm run build
npm run lint
```

## Seed Data and Demo Accounts

### Eventra bulk seed command

A management command exists for rich Eventra sample content:

```powershell
python backend\manage.py seed_eventra --events-per-category 3
```

Useful options:
- --reset
- --skip-images

### Integration test data script

```powershell
python backend\create_test_data.py
```

### Organizer demo account and sample events

If created in your local DB, you can use:
- organizer.demo@platforma.local
- Organizer123!

## API Overview

Base:
- /api/v1/

Core:
- /api/v1/auth/
	- register, login, token/refresh, logout, password/change
- /api/v1/users/
	- profile
	- addresses
- /api/v1/payments/
- /api/v1/notifications/
- /api/v1/search/

Zesty:
- /api/v1/zesty/restaurants/
- /api/v1/zesty/menu-items/
- /api/v1/zesty/orders/

Eventra:
- /api/v1/eventra/events/
- /api/v1/eventra/bookings/
- /api/v1/eventra/ticket-types/
- /api/v1/eventra/seats/

Legacy discovery endpoints:
- /api/restaurants/
- /api/areas/
- /api/cuisines/

## Role and Permission Model

### customer

- Can browse restaurants/events
- Can place orders and event bookings
- Can view and manage own orders/bookings/profile

### restaurant_owner

- Can manage own restaurants and menu items
- Can view incoming customer orders for owned restaurants
- Can update order status

### event_organizer

- Can create/manage own events, ticket types, seats
- Can view bookings for own events
- Can publish/unpublish/cancel events

### admin/staff

- Elevated visibility and management access across datasets

## Dynamic Update Behavior

The project includes polling-based update behavior for near-real-time UX:

- Notification polling for auth users
- Eventra landing/list refresh for customer visibility of newly published events
- Organizer dashboard booking/event refresh loops
- Restaurant owner dashboard order refresh loops

This supports flows such as:
- Organizer creates/publishes event -> customer sees updates quickly
- Customer books event -> organizer dashboard/notifications update quickly

## Testing

### Backend

```powershell
python backend\manage.py test
```

Or specific suites:

```powershell
python backend\manage.py test core
python backend\manage.py test zesty
python backend\manage.py test eventra
```

### Frontend

Build verification:

```powershell
cd frontend\zesty-app
npm run build
```

## Troubleshooting

### 1) python manage.py runserver fails with file path errors

Cause:
- Running command from wrong working directory.

Fix:
- Either run from backend/ with python manage.py runserver
- Or run from repo root with python backend\manage.py runserver

### 2) Frontend cannot call APIs

Check:
- Backend is running on port 8000
- Frontend uses VITE_API_BASE_URL pointing to /api/v1

### 3) Auth works but data missing in dashboards

Check:
- Logged-in user role (customer vs owner/organizer)
- Event/restaurant ownership
- Event publish status for customer visibility

### 4) Migration errors on startup

Run:

```powershell
python backend\manage.py migrate
python backend\manage.py check
```

### 5) CORS issues in browser console

Check:
- CORS_ALLOWED_ORIGINS in .env
- Local frontend origin (http://localhost:5173)

## Notes for Contributors

- Keep API contracts under /api/v1 consistent.
- Prefer role-aware queryset and permission checks in backend viewsets.
- When adding new frontend API calls, keep base URL versioned.
- Update this README when setup commands, env requirements, or route contracts change.

---

If you want, a separate API reference document can be added with request/response examples for every major endpoint.
