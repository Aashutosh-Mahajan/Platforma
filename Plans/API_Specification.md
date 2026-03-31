# API Specification
## Zesty & Eventra Platform REST API

**Version**: 1.0  
**Base URL**: `/api/v1`  
**Authentication**: JWT Bearer Token

---

## 1. Authentication Endpoints

### Register User
```
POST /auth/register/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepass123",
  "password_confirm": "securepass123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+919876543210",
  "role": "customer"  // customer, restaurant_owner, event_organizer
}

Response: 201 Created
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+919876543210",
  "role": "customer"
}
```

### Login
```
POST /auth/login/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepass123"
}

Response: 200 OK
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Refresh Token
```
POST /auth/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

Response: 200 OK
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Logout
```
POST /auth/logout/
Authorization: Bearer <access_token>

Response: 200 OK
{
  "message": "Successfully logged out"
}
```

---

## 2. User Profile Endpoints

### Get Profile
```
GET /users/profile/
Authorization: Bearer <access_token>

Response: 200 OK
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+919876543210",
  "avatar": "https://cdn.example.com/avatars/user1.jpg",
  "role": "customer"
}
```

### Update Profile
```
PATCH /users/profile/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "first_name": "Jane",
  "last_name": "Smith",
  "phone": "+919876543211"
}

Response: 200 OK
```

### Add Address
```
POST /users/addresses/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "label": "home",
  "street": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "postal_code": "400001",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "is_default": true
}

Response: 201 Created
{
  "id": 1,
  "label": "home",
  "street": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "postal_code": "400001",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "is_default": true
}
```

### Get Addresses
```
GET /users/addresses/
Authorization: Bearer <access_token>

Response: 200 OK
[
  {
    "id": 1,
    "label": "home",
    "street": "123 Main St",
    "city": "Mumbai",
    ...
  },
  {
    "id": 2,
    "label": "work",
    "street": "456 Office Ave",
    "city": "Mumbai",
    ...
  }
]
```

---

## 3. Zesty - Restaurants

### List Restaurants
```
GET /zesty/restaurants/?search=pizza&ordering=-rating&limit=20&offset=0
Authorization: Bearer <access_token> (optional)
Query Parameters:
  - search: Search by name or cuisine
  - lat: Latitude for location filter
  - lng: Longitude for location filter
  - radius: Radius in km (default: 5)
  - ordering: Sort by rating, delivery_fee, delivery_time_max
  - limit: Page size (default: 20)
  - offset: Page number (default: 0)

Response: 200 OK
{
  "count": 150,
  "next": "https://api.example.com/zesty/restaurants/?offset=20",
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Pizza Paradise",
      "description": "Best pizza in town",
      "cuisine_types": "Italian, Continental",
      "latitude": 19.0760,
      "longitude": 72.8777,
      "delivery_fee": 40.00,
      "delivery_time_min": 25,
      "delivery_time_max": 40,
      "image": "https://cdn.example.com/restaurants/1.jpg",
      "rating": 4.5,
      "review_count": 250,
      "is_active": true
    }
  ]
}
```

### Get Restaurant Details
```
GET /zesty/restaurants/{id}/
Authorization: Bearer <access_token> (optional)

Response: 200 OK
{
  "id": 1,
  "name": "Pizza Paradise",
  "description": "Best pizza in town",
  "cuisine_types": "Italian, Continental",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "delivery_fee": 40.00,
  "delivery_time_min": 25,
  "delivery_time_max": 40,
  "image": "https://cdn.example.com/restaurants/1.jpg",
  "banner": "https://cdn.example.com/restaurant_banners/1.jpg",
  "rating": 4.5,
  "review_count": 250,
  "is_active": true,
  "menu_items": [
    {
      "id": 1,
      "name": "Margherita Pizza",
      "description": "Classic pizza with mozzarella",
      "price": 299.99,
      "category": "Pizza",
      "image": "https://cdn.example.com/menu/1.jpg",
      "is_vegetarian": true,
      "is_vegan": false,
      "is_available": true
    }
  ]
}
```

### Search Menu Items
```
GET /zesty/restaurants/{restaurant_id}/menu/?search=pizza&category=pizza
Authorization: Bearer <access_token> (optional)

Response: 200 OK
{
  "count": 10,
  "results": [
    {
      "id": 1,
      "name": "Margherita Pizza",
      "price": 299.99,
      "category": "Pizza",
      "image": "https://cdn.example.com/menu/1.jpg",
      "is_vegetarian": true,
      "is_available": true
    }
  ]
}
```

### Get Reviews
```
GET /zesty/restaurants/{id}/reviews/?ordering=-created_at
Authorization: Bearer <access_token> (optional)

Response: 200 OK
{
  "count": 50,
  "results": [
    {
      "id": 1,
      "user": "John Doe",
      "rating": 5,
      "comment": "Amazing food and fast delivery!",
      "created_at": "2024-03-20T10:30:00Z"
    }
  ]
}
```

### Add Review
```
POST /zesty/restaurants/{id}/reviews/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "rating": 5,
  "comment": "Amazing food and fast delivery!"
}

Response: 201 Created
```

---

## 4. Zesty - Orders & Cart

### Create Order
```
POST /zesty/orders/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "restaurant_id": 1,
  "delivery_address_id": 1,
  "items": [
    {
      "menu_item_id": 1,
      "quantity": 2
    },
    {
      "menu_item_id": 5,
      "quantity": 1
    }
  ],
  "special_instructions": "Extra cheese on pizza",
  "payment_method": "credit_card"
}

Response: 201 Created
{
  "id": 100,
  "restaurant": {
    "id": 1,
    "name": "Pizza Paradise"
  },
  "status": "pending",
  "items": [
    {
      "id": 1,
      "menu_item": {
        "id": 1,
        "name": "Margherita Pizza",
        "price": 299.99
      },
      "quantity": 2,
      "unit_price": 299.99,
      "total": 599.98
    }
  ],
  "subtotal": 599.98,
  "delivery_fee": 40.00,
  "tax": 96.00,
  "total": 735.98,
  "estimated_delivery": "2024-03-20T11:15:00Z",
  "created_at": "2024-03-20T10:30:00Z"
}
```

### Get Order Details
```
GET /zesty/orders/{id}/
Authorization: Bearer <access_token>

Response: 200 OK
{
  "id": 100,
  "restaurant": {...},
  "status": "confirmed",
  "items": [...],
  "subtotal": 599.98,
  "delivery_fee": 40.00,
  "tax": 96.00,
  "total": 735.98,
  "estimated_delivery": "2024-03-20T11:15:00Z",
  "actual_delivery": null,
  "created_at": "2024-03-20T10:30:00Z",
  "updated_at": "2024-03-20T10:32:00Z"
}
```

### List Orders
```
GET /zesty/orders/?status=delivered&ordering=-created_at
Authorization: Bearer <access_token>
Query Parameters:
  - status: pending, confirmed, preparing, ready, out_for_delivery, delivered, cancelled
  - ordering: -created_at, restaurant__name

Response: 200 OK
{
  "count": 25,
  "results": [...]
}
```

### Cancel Order
```
PATCH /zesty/orders/{id}/cancel/
Authorization: Bearer <access_token>

Response: 200 OK
{
  "id": 100,
  "status": "cancelled",
  "message": "Order cancelled successfully"
}
```

### Track Order (Real-time)
```
GET /zesty/orders/{id}/tracking/
Authorization: Bearer <access_token>

Response: 200 OK
{
  "order_id": 100,
  "status": "out_for_delivery",
  "estimated_delivery": "2024-03-20T11:15:00Z",
  "delivery_partner": {
    "id": 1,
    "name": "Raj Kumar",
    "phone": "+919876543210",
    "vehicle": "Bike",
    "rating": 4.8
  },
  "current_location": {
    "latitude": 19.0900,
    "longitude": 72.8600,
    "timestamp": "2024-03-20T10:45:00Z"
  }
}
```

---

## 5. Eventra - Events

### List Events
```
GET /eventra/events/?search=concert&category=concert&date_from=2024-04-01&ordering=-event_date
Authorization: Bearer <access_token> (optional)
Query Parameters:
  - search: Search by name
  - category: movie, concert, sports, theater, comedy, expo
  - date_from: Filter events after this date (ISO 8601)
  - date_to: Filter events before this date
  - city: Filter by city
  - min_price: Minimum ticket price
  - max_price: Maximum ticket price
  - ordering: event_date, rating, -event_date

Response: 200 OK
{
  "count": 45,
  "results": [
    {
      "id": 1,
      "name": "Coldplay Live Concert",
      "description": "Coldplay performing their greatest hits",
      "category": "concert",
      "venue_name": "DY Patil Stadium",
      "address": "Nerul, Navi Mumbai",
      "latitude": 19.0000,
      "longitude": 73.0000,
      "event_date": "2024-04-15T19:00:00Z",
      "event_end_date": "2024-04-15T22:00:00Z",
      "image": "https://cdn.example.com/events/1.jpg",
      "banner": "https://cdn.example.com/event_banners/1.jpg",
      "rating": 4.8,
      "review_count": 320,
      "total_seats": 50000,
      "available_seats": 15000,
      "is_published": true
    }
  ]
}
```

### Get Event Details
```
GET /eventra/events/{id}/
Authorization: Bearer <access_token> (optional)

Response: 200 OK
{
  "id": 1,
  "name": "Coldplay Live Concert",
  "description": "Coldplay performing their greatest hits",
  "category": "concert",
  "venue_name": "DY Patil Stadium",
  "address": "Nerul, Navi Mumbai",
  "latitude": 19.0000,
  "longitude": 73.0000,
  "event_date": "2024-04-15T19:00:00Z",
  "event_end_date": "2024-04-15T22:00:00Z",
  "image": "https://cdn.example.com/events/1.jpg",
  "banner": "https://cdn.example.com/event_banners/1.jpg",
  "rating": 4.8,
  "review_count": 320,
  "total_seats": 50000,
  "available_seats": 15000,
  "is_published": true,
  "ticket_types": [
    {
      "id": 1,
      "name": "Standard",
      "price": 1500.00,
      "quantity_total": 25000,
      "quantity_available": 8000,
      "description": "General seating",
      "benefits": "Access to venue"
    },
    {
      "id": 2,
      "name": "VIP",
      "price": 4500.00,
      "quantity_total": 15000,
      "quantity_available": 5000,
      "description": "Premium seating near stage",
      "benefits": "Premium seating, dedicated entry"
    },
    {
      "id": 3,
      "name": "Premium",
      "price": 7500.00,
      "quantity_total": 10000,
      "quantity_available": 2000,
      "description": "Best seats in the house",
      "benefits": "Premium seating, dedicated entry, free merchandise"
    }
  ]
}
```

### Get Seat Map
```
GET /eventra/events/{id}/seats/?ticket_type_id=1
Authorization: Bearer <access_token> (optional)
Query Parameters:
  - ticket_type_id: Filter seats by ticket type
  - section: Filter by section
  - status: available, booked, reserved, blocked

Response: 200 OK
{
  "event_id": 1,
  "sections": [
    {
      "name": "A",
      "rows": [
        {
          "row": "1",
          "seats": [
            {
              "id": 1,
              "seat_number": "1",
              "status": "available",
              "ticket_type": "Standard",
              "price": 1500.00
            },
            {
              "id": 2,
              "seat_number": "2",
              "status": "booked",
              "ticket_type": "Standard",
              "price": 1500.00
            }
          ]
        }
      ]
    }
  ]
}
```

### Get Reviews
```
GET /eventra/events/{id}/reviews/
Authorization: Bearer <access_token> (optional)

Response: 200 OK
{
  "count": 80,
  "results": [
    {
      "id": 1,
      "user": "John Doe",
      "rating": 5,
      "comment": "Amazing concert! Worth every penny!",
      "created_at": "2024-04-16T10:30:00Z"
    }
  ]
}
```

---

## 6. Eventra - Bookings & Tickets

### Create Booking
```
POST /eventra/bookings/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "event_id": 1,
  "tickets": [
    {
      "ticket_type_id": 2,  // VIP
      "quantity": 2,
      "seats": [45, 46]  // Optional: specific seat IDs
    }
  ],
  "payment_method": "credit_card",
  "promo_code": "SAVE20"  // Optional
}

Response: 201 Created
{
  "id": 500,
  "booking_reference": "EB-2024-03-20-0001",
  "event": {
    "id": 1,
    "name": "Coldplay Live Concert"
  },
  "status": "pending",
  "total_tickets": 2,
  "booked_seats": [
    {
      "id": 45,
      "section": "A",
      "row": "5",
      "seat_number": "10",
      "ticket_type": "VIP"
    },
    {
      "id": 46,
      "section": "A",
      "row": "5",
      "seat_number": "11",
      "ticket_type": "VIP"
    }
  ],
  "subtotal": 9000.00,
  "discount": 0.00,
  "tax": 1440.00,
  "total": 10440.00,
  "booking_date": "2024-03-20T10:30:00Z"
}
```

### Get Booking Details
```
GET /eventra/bookings/{id}/
Authorization: Bearer <access_token>

Response: 200 OK
{
  "id": 500,
  "booking_reference": "EB-2024-03-20-0001",
  "event": {...},
  "status": "confirmed",
  "booked_seats": [...],
  "total_tickets": 2,
  "subtotal": 9000.00,
  "tax": 1440.00,
  "total": 10440.00,
  "booking_date": "2024-03-20T10:30:00Z",
  "confirmation_sent": "2024-03-20T10:32:00Z",
  "tickets": [
    {
      "id": 1,
      "booking_reference": "EB-2024-03-20-0001",
      "ticket_number": "EBTN001",
      "qr_code": "https://cdn.example.com/qr/EBTN001.png",
      "seat": {...},
      "is_used": false,
      "used_at": null
    }
  ]
}
```

### List Bookings
```
GET /eventra/bookings/?status=confirmed&ordering=-booking_date
Authorization: Bearer <access_token>
Query Parameters:
  - status: pending, confirmed, completed, cancelled
  - ordering: -booking_date, event__event_date

Response: 200 OK
{
  "count": 15,
  "results": [...]
}
```

### Cancel Booking
```
PATCH /eventra/bookings/{id}/cancel/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "reason": "Found better seats"  // Optional
}

Response: 200 OK
{
  "id": 500,
  "booking_reference": "EB-2024-03-20-0001",
  "status": "cancelled",
  "refund_amount": 10440.00,
  "message": "Booking cancelled successfully. Refund will be processed within 5-7 business days."
}
```

### Download Tickets
```
GET /eventra/bookings/{id}/download-tickets/?format=pdf
Authorization: Bearer <access_token>
Query Parameters:
  - format: pdf, image

Response: 200 OK
(File download)
```

### Add Review
```
POST /eventra/bookings/{id}/review/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "rating": 5,
  "comment": "Amazing concert! Worth every penny!"
}

Response: 201 Created
```

---

## 7. Payment Endpoints

### Create Payment Intent
```
POST /payments/create-intent/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 735.98,
  "currency": "INR",
  "order_id": 100,  // For Zesty orders
  "booking_id": null,  // For Eventra bookings
  "payment_method": "credit_card"
}

Response: 200 OK
{
  "client_secret": "pi_1234567890_secret_abcdef",
  "payment_id": 1,
  "status": "requires_payment_method"
}
```

### Confirm Payment
```
POST /payments/{id}/confirm/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "payment_method_id": "pm_1234567890"
}

Response: 200 OK
{
  "id": 1,
  "amount": 735.98,
  "currency": "INR",
  "status": "completed",
  "transaction_id": "txn_1234567890"
}
```

### Get Payment Status
```
GET /payments/{id}/
Authorization: Bearer <access_token>

Response: 200 OK
{
  "id": 1,
  "amount": 735.98,
  "currency": "INR",
  "status": "completed",
  "transaction_id": "txn_1234567890",
  "created_at": "2024-03-20T10:30:00Z"
}
```

---

## 8. Search & Discovery

### Global Search
```
GET /search/?query=pizza&scope=all&limit=10
Authorization: Bearer <access_token> (optional)
Query Parameters:
  - query: Search term
  - scope: all, restaurants, events, menu
  - limit: Results per category (default: 10)

Response: 200 OK
{
  "restaurants": [
    {
      "id": 1,
      "name": "Pizza Paradise",
      "type": "restaurant"
    }
  ],
  "events": [
    {
      "id": 1,
      "name": "Pizza Festival",
      "type": "event"
    }
  ],
  "menu_items": [
    {
      "id": 1,
      "name": "Margherita Pizza",
      "restaurant_id": 1,
      "type": "menu_item"
    }
  ]
}
```

---

## 9. Notifications

### Get Notifications
```
GET /notifications/?unread=true&ordering=-created_at
Authorization: Bearer <access_token>
Query Parameters:
  - unread: true/false
  - type: order_status, event_reminder, booking_confirmation
  - ordering: -created_at

Response: 200 OK
{
  "count": 5,
  "results": [
    {
      "id": 1,
      "type": "order_status",
      "title": "Order Confirmed",
      "message": "Your order from Pizza Paradise is confirmed",
      "related_id": 100,
      "related_type": "order",
      "is_read": false,
      "created_at": "2024-03-20T10:35:00Z"
    }
  ]
}
```

### Mark Notification as Read
```
PATCH /notifications/{id}/mark-read/
Authorization: Bearer <access_token>

Response: 200 OK
```

---

## 10. Error Responses

### Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "This field is required."
      }
    ]
  },
  "timestamp": "2024-03-20T10:30:00Z",
  "request_id": "req_1234567890"
}
```

### Common Status Codes
| Code | Description |
|------|-------------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## 11. Pagination

All list endpoints support pagination:
```
GET /zesty/restaurants/?limit=20&offset=0

Response:
{
  "count": 150,        // Total items
  "next": "https://api.example.com/zesty/restaurants/?limit=20&offset=20",
  "previous": null,
  "results": [...]
}
```

---

## 12. Rate Limiting

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1234567890
```

**Limits:**
- Unauthenticated: 100 requests/hour
- Authenticated: 1000 requests/hour
- Payment endpoints: 50 requests/hour

---

## 13. Webhooks (Future)

### Payment Webhook
```
POST /webhooks/stripe/
Content-Type: application/json

{
  "id": "evt_1234567890",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234567890",
      "status": "succeeded",
      "metadata": {
        "order_id": 100
      }
    }
  }
}
```

---

**Last Updated**: March 2026
**Maintainer**: Backend Team
