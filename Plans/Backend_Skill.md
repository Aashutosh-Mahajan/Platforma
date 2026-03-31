# Backend Skill Document
## Django Architecture for Zesty & Eventra

**Version**: 1.0  
**Framework**: Django 4.2+ | Django REST Framework | PostgreSQL 14+

---

## 1. Backend Architecture Overview

### Service-Oriented Architecture

```
Backend Structure:
├── Core App (Shared Services)
│   ├── Authentication & Authorization
│   ├── User Management
│   ├── Payment Processing
│   └── Notifications System
├── Zesty App (Food Delivery)
│   ├── Restaurants
│   ├── Menu Management
│   ├── Orders & Order Tracking
│   └── Delivery Management
└── Eventra App (Event Management)
    ├── Events
    ├── Tickets & Booking
    ├── Seat Management
    └── Event Analytics
```

### Django Project Structure

```
backend/
├── config/
│   ├── __init__.py
│   ├── settings.py         # Django settings
│   ├── urls.py             # Main URL routing
│   ├── asgi.py             # ASGI configuration
│   ├── wsgi.py             # WSGI configuration
│   └── celery.py           # Celery configuration
│
├── core/
│   ├── migrations/
│   ├── admin.py
│   ├── apps.py
│   ├── models.py           # User, Auth, Payment
│   ├── views.py
│   ├── serializers.py
│   ├── urls.py
│   ├── permissions.py      # Custom permissions
│   ├── authentication.py   # JWT authentication
│   └── middleware.py
│
├── zesty/
│   ├── migrations/
│   ├── admin.py
│   ├── apps.py
│   ├── models.py           # Restaurant, Menu, Order
│   ├── views.py
│   ├── serializers.py
│   ├── urls.py
│   ├── filters.py          # Search/filter logic
│   ├── permissions.py      # Restaurant permissions
│   └── signals.py          # Order notifications
│
├── eventra/
│   ├── migrations/
│   ├── admin.py
│   ├── apps.py
│   ├── models.py           # Event, Ticket, Booking
│   ├── views.py
│   ├── serializers.py
│   ├── urls.py
│   ├── filters.py          # Event search
│   ├── permissions.py      # Event permissions
│   └── signals.py          # Booking notifications
│
├── utils/
│   ├── __init__.py
│   ├── pagination.py       # Custom pagination
│   ├── exception_handlers.py
│   ├── validators.py       # Custom validators
│   ├── email.py            # Email utilities
│   ├── payment.py          # Payment integration
│   ├── geolocation.py      # Location services
│   └── analytics.py        # Event tracking
│
├── management/
│   └── commands/
│       ├── seed_data.py    # Seed test data
│       └── cleanup.py      # Periodic cleanup
│
├── tests/
│   ├── test_core.py
│   ├── test_zesty.py
│   └── test_eventra.py
│
├── requirements.txt        # Dependencies
├── manage.py
├── .env.example
└── Dockerfile
```

---

## 2. Core Models

### User Model

```python
# core/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = [
        ('customer', 'Customer'),
        ('restaurant_owner', 'Restaurant Owner'),
        ('event_organizer', 'Event Organizer'),
        ('delivery_partner', 'Delivery Partner'),
        ('admin', 'Administrator'),
    ]

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    is_email_verified = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)

    # Meta
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['phone']),
            models.Index(fields=['role']),
        ]

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"


class Address(models.Model):
    LABEL_CHOICES = [
        ('home', 'Home'),
        ('work', 'Work'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    label = models.CharField(max_length=20, choices=LABEL_CHOICES)
    street = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    latitude = models.DecimalField(max_digits=10, decimal_places=8)
    longitude = models.DecimalField(max_digits=11, decimal_places=8)
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = 'addresses'
        verbose_name_plural = 'Addresses'

    def __str__(self):
        return f"{self.label} - {self.user.email}"
```

### Payment Model

```python
# core/models.py
from django.db import models

class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    METHOD_CHOICES = [
        ('credit_card', 'Credit Card'),
        ('debit_card', 'Debit Card'),
        ('upi', 'UPI'),
        ('wallet', 'Wallet'),
        ('net_banking', 'Net Banking'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Payment gateway reference
    transaction_id = models.CharField(max_length=255, unique=True, null=True)
    payment_gateway = models.CharField(max_length=20, choices=[
        ('stripe', 'Stripe'),
        ('razorpay', 'Razorpay'),
    ])

    # Related order/booking
    content_type = models.CharField(max_length=50)  # 'order' or 'booking'
    object_id = models.IntegerField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment {self.id} - {self.amount} {self.currency}"
```

---

## 3. Zesty Models

```python
# zesty/models.py
from django.db import models
from core.models import User

class Restaurant(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='restaurants')
    name = models.CharField(max_length=255)
    description = models.TextField()
    cuisine_types = models.CharField(max_length=255)  # Comma-separated
    
    # Location
    latitude = models.DecimalField(max_digits=10, decimal_places=8)
    longitude = models.DecimalField(max_digits=11, decimal_places=8)
    address = models.CharField(max_length=255)

    # Delivery info
    delivery_fee = models.DecimalField(max_digits=5, decimal_places=2)
    delivery_time_min = models.IntegerField()  # minutes
    delivery_time_max = models.IntegerField()

    # Media
    image = models.ImageField(upload_to='restaurants/')
    banner = models.ImageField(upload_to='restaurant_banners/')

    # Metrics
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.IntegerField(default=0)

    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'restaurants'
        indexes = [
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['rating']),
        ]

    def __str__(self):
        return self.name


class MenuItem(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='menu_items')
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=8, decimal_places=2)
    
    # Metadata
    category = models.CharField(max_length=100)
    image = models.ImageField(upload_to='menu_items/')
    
    # Flags
    is_vegetarian = models.BooleanField(default=False)
    is_vegan = models.BooleanField(default=False)
    is_available = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'menu_items'

    def __str__(self):
        return f"{self.restaurant.name} - {self.name}"


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('preparing', 'Preparing'),
        ('ready', 'Ready'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    restaurant = models.ForeignKey(Restaurant, on_delete=models.PROTECT, related_name='orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Address
    delivery_address = models.ForeignKey('core.Address', on_delete=models.SET_NULL, null=True)

    # Amount
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_fee = models.DecimalField(max_digits=5, decimal_places=2)
    tax = models.DecimalField(max_digits=8, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    # Timeline
    estimated_delivery = models.DateTimeField()
    actual_delivery = models.DateTimeField(null=True, blank=True)

    # Special
    special_instructions = models.TextField(blank=True)
    payment = models.OneToOneField('core.Payment', on_delete=models.SET_NULL, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.id} - {self.user.email}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    menu_item = models.ForeignKey(MenuItem, on_delete=models.PROTECT)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.menu_item.name} x {self.quantity}"


class Review(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='reviews')
    order = models.OneToOneField(Order, on_delete=models.SET_NULL, null=True)
    
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reviews'
        unique_together = ('user', 'restaurant')

    def __str__(self):
        return f"{self.restaurant.name} - {self.rating}★"
```

---

## 4. Eventra Models

```python
# eventra/models.py
from django.db import models
from core.models import User

class Event(models.Model):
    CATEGORY_CHOICES = [
        ('movie', 'Movie'),
        ('concert', 'Concert'),
        ('sports', 'Sports'),
        ('theater', 'Theater'),
        ('comedy', 'Comedy'),
        ('expo', 'Expo'),
    ]

    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='events')
    name = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)

    # Venue
    venue_name = models.CharField(max_length=255)
    address = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=10, decimal_places=8)
    longitude = models.DecimalField(max_digits=11, decimal_places=8)

    # Dates
    event_date = models.DateTimeField()
    event_end_date = models.DateTimeField(null=True, blank=True)

    # Media
    image = models.ImageField(upload_to='events/')
    banner = models.ImageField(upload_to='event_banners/')

    # Metrics
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.IntegerField(default=0)

    # Seat capacity
    total_seats = models.IntegerField()
    available_seats = models.IntegerField()

    # Status
    is_published = models.BooleanField(default=False)
    is_cancelled = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'events'
        ordering = ['-event_date']

    def __str__(self):
        return self.name


class TicketType(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='ticket_types')
    name = models.CharField(max_length=100)  # Standard, VIP, Premium
    price = models.DecimalField(max_digits=10, decimal_places=2)
    
    quantity_total = models.IntegerField()
    quantity_available = models.IntegerField()
    
    description = models.TextField(blank=True)
    benefits = models.TextField(blank=True)

    class Meta:
        db_table = 'ticket_types'

    def __str__(self):
        return f"{self.event.name} - {self.name}"


class Seat(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('booked', 'Booked'),
        ('reserved', 'Reserved'),
        ('blocked', 'Blocked'),
    ]

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='seats')
    section = models.CharField(max_length=50)
    row = models.CharField(max_length=10)
    seat_number = models.CharField(max_length=10)
    
    ticket_type = models.ForeignKey(TicketType, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')

    class Meta:
        db_table = 'seats'
        unique_together = ('event', 'section', 'row', 'seat_number')

    def __str__(self):
        return f"{self.event.name} - {self.section}{self.row}{self.seat_number}"


class Booking(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='bookings')
    
    booking_reference = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Amount
    total_tickets = models.IntegerField()
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax = models.DecimalField(max_digits=8, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    # Payment
    payment = models.OneToOneField('core.Payment', on_delete=models.SET_NULL, null=True, blank=True)

    # Timeline
    booking_date = models.DateTimeField(auto_now_add=True)
    confirmation_sent = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'bookings'
        ordering = ['-booking_date']

    def __str__(self):
        return f"Booking {self.booking_reference} - {self.user.email}"


class BookingSeat(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='booked_seats')
    seat = models.ForeignKey(Seat, on_delete=models.PROTECT)

    class Meta:
        db_table = 'booking_seats'

    def __str__(self):
        return f"{self.booking.booking_reference} - {self.seat}"


class EventReview(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='event_reviews')
    booking = models.OneToOneField(Booking, on_delete=models.SET_NULL, null=True)
    
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'event_reviews'
        unique_together = ('user', 'event')

    def __str__(self):
        return f"{self.event.name} - {self.rating}★"
```

---

## 5. Serializers

### Core Serializers

```python
# core/serializers.py
from rest_framework import serializers
from core.models import User, Address

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'phone', 'avatar', 'role']
        read_only_fields = ['id']

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['id', 'label', 'street', 'city', 'state', 'postal_code', 
                  'latitude', 'longitude', 'is_default']

class RegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone = serializers.CharField(required=False)

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords do not match")
        return data

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=validated_data.get('phone', '')
        )
        return user
```

### Zesty Serializers

```python
# zesty/serializers.py
from rest_framework import serializers
from zesty.models import Restaurant, MenuItem, Order, OrderItem, Review

class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = ['id', 'name', 'description', 'price', 'category', 'image', 
                  'is_vegetarian', 'is_vegan', 'is_available']

class RestaurantSerializer(serializers.ModelSerializer):
    menu_items = MenuItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Restaurant
        fields = ['id', 'name', 'description', 'cuisine_types', 'latitude', 
                  'longitude', 'delivery_fee', 'delivery_time_min', 
                  'delivery_time_max', 'image', 'rating', 'review_count', 
                  'menu_items']

class OrderItemSerializer(serializers.ModelSerializer):
    menu_item = MenuItemSerializer(read_only=True)
    menu_item_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = OrderItem
        fields = ['id', 'menu_item', 'menu_item_id', 'quantity', 'unit_price', 'total']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    restaurant = RestaurantSerializer(read_only=True)
    
    class Meta:
        model = Order
        fields = ['id', 'user', 'restaurant', 'status', 'items', 'subtotal', 
                  'delivery_fee', 'tax', 'total', 'estimated_delivery', 
                  'actual_delivery', 'created_at']
```

---

## 6. API Views

### Authentication Views

```python
# core/views.py
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from core.serializers import UserSerializer, RegistrationSerializer

class RegistrationView(viewsets.ViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = RegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                UserSerializer(user).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=['get'])
    def profile(self, request):
        user = request.user
        serializer = self.get_serializer(user)
        return Response(serializer.data)
```

### Restaurant Views

```python
# zesty/views.py
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from zesty.models import Restaurant, Order, MenuItem
from zesty.serializers import RestaurantSerializer, OrderSerializer

class RestaurantViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Restaurant.objects.filter(is_active=True, is_verified=True)
    serializer_class = RestaurantSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'cuisine_types']
    ordering_fields = ['rating', 'delivery_fee', 'delivery_time_max']

    def get_queryset(self):
        # Filter by location if coordinates provided
        lat = self.request.query_params.get('lat')
        lng = self.request.query_params.get('lng')
        
        if lat and lng:
            # Use geospatial query
            from django.contrib.gis.measure import D
            # Implement location-based filtering
            pass
        
        return self.queryset

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        # Handle order creation
        pass

    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status in ['pending', 'confirmed']:
            order.status = 'cancelled'
            order.save()
            return Response(OrderSerializer(order).data)
        return Response(
            {'error': 'Cannot cancel order'},
            status=status.HTTP_400_BAD_REQUEST
        )
```

---

## 7. Middleware & Utilities

### Custom Exceptions

```python
# utils/exception_handlers.py
from rest_framework.views import exception_handler as drf_exception_handler

def custom_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    
    if response is None:
        return None
    
    # Customize response format
    if response.status_code >= 500:
        # Log to error tracking service (Sentry)
        pass
    
    return response
```

### Payment Utility

```python
# utils/payment.py
import stripe
from django.conf import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

class PaymentProcessor:
    @staticmethod
    def process_payment(payment_data):
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(payment_data['amount'] * 100),
                currency='inr',
                metadata={
                    'order_id': payment_data.get('order_id'),
                    'user_id': payment_data.get('user_id'),
                }
            )
            return intent
        except stripe.error.CardError as e:
            raise ValueError(f"Payment failed: {e.user_message}")

    @staticmethod
    def handle_webhook(event):
        if event['type'] == 'payment_intent.succeeded':
            # Update order status
            pass
```

---

## 8. Testing

```python
# tests/test_zesty.py
from django.test import TestCase
from rest_framework.test import APIClient
from core.models import User
from zesty.models import Restaurant

class RestaurantAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )

    def test_list_restaurants(self):
        response = self.client.get('/api/zesty/restaurants/')
        self.assertEqual(response.status_code, 200)

    def test_create_order(self):
        restaurant = Restaurant.objects.create(
            owner=self.user,
            name='Test Restaurant',
            # ... other fields
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/zesty/orders/', {
            'restaurant_id': restaurant.id,
            # ... order data
        })
        self.assertEqual(response.status_code, 201)
```

---

## 9. Settings Configuration

```python
# config/settings.py
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'celery',
    
    # Local apps
    'core',
    'zesty',
    'eventra',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    # ... other middleware
]

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'https://yourdomain.com',
]

# JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}
```

---

## 10. Deployment with Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Create non-root user
RUN useradd -m django && chown -R django:django /app
USER django

# Expose port
EXPOSE 8000

# Run migrations and start server
CMD ["sh", "-c", "python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:8000"]
```

---

## 11. Performance Optimization

### Database Optimization

```python
# Use select_related and prefetch_related
class OrderViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Order.objects.select_related(
            'user',
            'restaurant',
            'payment'
        ).prefetch_related(
            'items__menu_item'
        )
```

### Caching

```python
# Use Redis caching
from django.views.decorators.cache import cache_page

@cache_page(60 * 5)  # Cache for 5 minutes
def get_restaurants(request):
    # ...
```

---

**Document Owner**: Backend Lead  
**Last Updated**: March 2026
