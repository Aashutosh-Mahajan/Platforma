"""
Tests for Zesty module - Restaurant serializers and views.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal

from zesty.models import Restaurant, MenuItem, Order, OrderItem, DeliveryTracking, Review
from zesty.serializers import RestaurantListSerializer, RestaurantDetailSerializer

User = get_user_model()


class RestaurantSerializerTests(TestCase):
    """Test restaurant serializers."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='owner@test.com',
            username='owner',
            password='testpass123',
            role='restaurant_owner'
        )
        self.restaurant = Restaurant.objects.create(
            owner=self.user,
            name='Test Restaurant',
            description='A test restaurant',
            cuisine_types='Italian, Pizza',
            address='123 Test St',
            delivery_fee=Decimal('50.00'),
            delivery_time_min=20,
            delivery_time_max=40,
            rating=Decimal('4.50'),
            review_count=10,
            is_active=True
        )
        self.menu_item = MenuItem.objects.create(
            restaurant=self.restaurant,
            name='Margherita Pizza',
            description='Classic pizza',
            price=Decimal('299.00'),
            category='Pizza',
            is_vegetarian=True,
            is_available=True
        )

    def test_restaurant_list_serializer_fields(self):
        """Test RestaurantListSerializer contains correct fields."""
        serializer = RestaurantListSerializer(self.restaurant)
        data = serializer.data
        
        # Check all required fields are present
        expected_fields = [
            'id', 'name', 'description', 'cuisine_types', 'address',
            'delivery_fee', 'delivery_time_min', 'delivery_time_max',
            'image', 'rating', 'review_count', 'is_active'
        ]
        for field in expected_fields:
            self.assertIn(field, data)
        
        # Verify field values
        self.assertEqual(data['name'], 'Test Restaurant')
        self.assertEqual(data['cuisine_types'], 'Italian, Pizza')
        self.assertEqual(float(data['rating']), 4.50)
        self.assertEqual(data['review_count'], 10)

    def test_restaurant_detail_serializer_includes_menu_items(self):
        """Test RestaurantDetailSerializer includes menu items."""
        serializer = RestaurantDetailSerializer(self.restaurant)
        data = serializer.data
        
        # Check menu_items field is present
        self.assertIn('menu_items', data)
        self.assertEqual(len(data['menu_items']), 1)
        
        # Verify menu item data
        menu_item = data['menu_items'][0]
        self.assertEqual(menu_item['name'], 'Margherita Pizza')
        self.assertEqual(float(menu_item['price']), 299.00)
        self.assertTrue(menu_item['is_vegetarian'])


class RestaurantViewSetTests(TestCase):
    """Test restaurant viewset endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='customer@test.com',
            username='customer',
            password='testpass123',
            role='customer'
        )
        self.owner = User.objects.create_user(
            email='owner@test.com',
            username='owner',
            password='testpass123',
            role='restaurant_owner'
        )
        
        # Create test restaurants
        self.restaurant1 = Restaurant.objects.create(
            owner=self.owner,
            name='Pizza Palace',
            description='Best pizza in town',
            cuisine_types='Italian, Pizza',
            address='123 Pizza St',
            delivery_fee=Decimal('50.00'),
            delivery_time_min=20,
            delivery_time_max=40,
            rating=Decimal('4.50'),
            review_count=120,
            is_active=True
        )
        self.restaurant2 = Restaurant.objects.create(
            owner=self.owner,
            name='Burger House',
            description='Delicious burgers',
            cuisine_types='American, Burgers',
            address='456 Burger Ave',
            delivery_fee=Decimal('30.00'),
            delivery_time_min=15,
            delivery_time_max=30,
            rating=Decimal('4.20'),
            review_count=80,
            is_active=True
        )
        self.restaurant3 = Restaurant.objects.create(
            owner=self.owner,
            name='Sushi Bar',
            description='Fresh sushi',
            cuisine_types='Japanese, Sushi',
            address='789 Sushi Rd',
            delivery_fee=Decimal('70.00'),
            delivery_time_min=30,
            delivery_time_max=50,
            rating=Decimal('4.80'),
            review_count=200,
            is_active=True
        )
        
        # Create menu items
        MenuItem.objects.create(
            restaurant=self.restaurant1,
            name='Margherita Pizza',
            price=Decimal('299.00'),
            category='Pizza',
            is_available=True
        )

    def test_list_restaurants_requires_authentication(self):
        """Test that listing restaurants requires authentication."""
        response = self.client.get('/api/v1/zesty/restaurants/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_restaurants_authenticated(self):
        """Test listing restaurants when authenticated."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/zesty/restaurants/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 3)

    def test_retrieve_restaurant_detail(self):
        """Test retrieving a single restaurant with details."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/v1/zesty/restaurants/{self.restaurant1.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Pizza Palace')
        self.assertIn('menu_items', response.data)
        self.assertEqual(len(response.data['menu_items']), 1)

    def test_search_restaurants_by_name(self):
        """Test searching restaurants by name."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/zesty/restaurants/?search=Pizza')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Pizza Palace')

    def test_search_restaurants_by_cuisine(self):
        """Test searching restaurants by cuisine type."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/zesty/restaurants/?search=Japanese')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Sushi Bar')

    def test_search_case_insensitive(self):
        """Test that search is case-insensitive."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/zesty/restaurants/?search=pizza')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_ordering_by_rating_descending(self):
        """Test ordering restaurants by rating (descending)."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/zesty/restaurants/?ordering=-rating')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(results[0]['name'], 'Sushi Bar')  # 4.80
        self.assertEqual(results[1]['name'], 'Pizza Palace')  # 4.50
        self.assertEqual(results[2]['name'], 'Burger House')  # 4.20

    def test_ordering_by_rating_ascending(self):
        """Test ordering restaurants by rating (ascending)."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/zesty/restaurants/?ordering=rating')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(results[0]['name'], 'Burger House')  # 4.20
        self.assertEqual(results[1]['name'], 'Pizza Palace')  # 4.50
        self.assertEqual(results[2]['name'], 'Sushi Bar')  # 4.80

    def test_ordering_by_delivery_fee(self):
        """Test ordering restaurants by delivery fee."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/zesty/restaurants/?ordering=delivery_fee')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(results[0]['name'], 'Burger House')  # 30.00
        self.assertEqual(results[1]['name'], 'Pizza Palace')  # 50.00
        self.assertEqual(results[2]['name'], 'Sushi Bar')  # 70.00

    def test_ordering_by_delivery_time_max(self):
        """Test ordering restaurants by maximum delivery time."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/zesty/restaurants/?ordering=delivery_time_max')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(results[0]['name'], 'Burger House')  # 30
        self.assertEqual(results[1]['name'], 'Pizza Palace')  # 40
        self.assertEqual(results[2]['name'], 'Sushi Bar')  # 50

    def test_pagination_default_page_size(self):
        """Test that pagination is applied with default page size."""
        # Create more restaurants to test pagination
        for i in range(25):
            Restaurant.objects.create(
                owner=self.owner,
                name=f'Restaurant {i}',
                cuisine_types='Test',
                address=f'{i} Test St',
                is_active=True
            )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/zesty/restaurants/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertIn('results', response.data)
        
        # Default page size is 20
        self.assertEqual(len(response.data['results']), 20)
        self.assertEqual(response.data['count'], 28)  # 3 original + 25 new

    def test_pagination_custom_page_size(self):
        """Test pagination with custom page size."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/zesty/restaurants/?limit=2')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_pagination_next_page(self):
        """Test accessing next page of results."""
        # Create more restaurants
        for i in range(5):
            Restaurant.objects.create(
                owner=self.owner,
                name=f'Restaurant {i}',
                cuisine_types='Test',
                address=f'{i} Test St',
                is_active=True
            )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/zesty/restaurants/?limit=5&page=2')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)  # 8 total, page 2 has 3

    def test_only_active_restaurants_returned(self):
        """Test that only active restaurants are returned."""
        # Create inactive restaurant
        Restaurant.objects.create(
            owner=self.owner,
            name='Inactive Restaurant',
            cuisine_types='Test',
            address='999 Test St',
            is_active=False
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/zesty/restaurants/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only return the 3 active restaurants
        self.assertEqual(response.data['count'], 3)
        
        # Verify inactive restaurant is not in results
        names = [r['name'] for r in response.data['results']]
        self.assertNotIn('Inactive Restaurant', names)

    def test_combined_search_and_ordering(self):
        """Test combining search and ordering filters."""
        # Create another Italian restaurant
        Restaurant.objects.create(
            owner=self.owner,
            name='Italian Bistro',
            cuisine_types='Italian',
            address='321 Italian St',
            rating=Decimal('4.60'),
            is_active=True
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/zesty/restaurants/?search=Italian&ordering=-rating')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]['name'], 'Italian Bistro')  # 4.60
        self.assertEqual(results[1]['name'], 'Pizza Palace')  # 4.50


class RestaurantMenuEndpointTests(TestCase):
    """Test restaurant menu endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='customer@test.com',
            username='customer',
            password='testpass123',
            role='customer'
        )
        self.owner = User.objects.create_user(
            email='owner@test.com',
            username='owner',
            password='testpass123',
            role='restaurant_owner'
        )
        
        self.restaurant = Restaurant.objects.create(
            owner=self.owner,
            name='Test Restaurant',
            cuisine_types='Italian',
            address='123 Test St',
            is_active=True
        )
        
        # Create menu items in different categories
        MenuItem.objects.create(
            restaurant=self.restaurant,
            name='Margherita Pizza',
            price=Decimal('299.00'),
            category='Pizza',
            is_available=True
        )
        MenuItem.objects.create(
            restaurant=self.restaurant,
            name='Pepperoni Pizza',
            price=Decimal('349.00'),
            category='Pizza',
            is_available=True
        )
        MenuItem.objects.create(
            restaurant=self.restaurant,
            name='Caesar Salad',
            price=Decimal('199.00'),
            category='Salad',
            is_available=True
        )

    def test_get_restaurant_menu(self):
        """Test getting menu items for a restaurant."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/v1/zesty/restaurants/{self.restaurant.id}/menu/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 3)

    def test_filter_menu_by_category(self):
        """Test filtering menu items by category."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(
            f'/api/v1/zesty/restaurants/{self.restaurant.id}/menu/?category=Pizza'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        
        # Verify all items are pizzas
        for item in response.data['results']:
            self.assertEqual(item['category'], 'Pizza')

    def test_search_menu_items(self):
        """Test searching menu items by name."""
        self.client.force_authenticate(user=self.user)
        url = f'/api/v1/zesty/restaurants/{self.restaurant.id}/menu/?search=Margherita'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Margherita Pizza')



class OrderCreationTests(TestCase):
    """Test order creation with payment and notifications."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='customer@test.com',
            username='customer',
            password='testpass123',
            role='customer'
        )
        self.owner = User.objects.create_user(
            email='owner@test.com',
            username='owner',
            password='testpass123',
            role='restaurant_owner'
        )
        
        self.restaurant = Restaurant.objects.create(
            owner=self.owner,
            name='Test Restaurant',
            cuisine_types='Italian',
            address='123 Test St',
            delivery_fee=Decimal('50.00'),
            delivery_time_min=20,
            delivery_time_max=40,
            is_active=True
        )
        
        self.menu_item1 = MenuItem.objects.create(
            restaurant=self.restaurant,
            name='Margherita Pizza',
            price=Decimal('299.00'),
            category='Pizza',
            is_available=True
        )
        self.menu_item2 = MenuItem.objects.create(
            restaurant=self.restaurant,
            name='Caesar Salad',
            price=Decimal('199.00'),
            category='Salad',
            is_available=True
        )
        
        # Create address for user
        from core.models import Address
        self.address = Address.objects.create(
            user=self.user,
            label='home',
            street='123 Main St',
            city='Mumbai',
            state='Maharashtra',
            postal_code='400001',
            is_default=True
        )

    def test_create_order_with_items(self):
        """Test creating an order with multiple items."""
        self.client.force_authenticate(user=self.user)
        
        order_data = {
            'restaurant_id': self.restaurant.id,
            'delivery_address_id': self.address.id,
            'special_instructions': 'Extra cheese',
            'payment_method': 'credit_card',
            'items': [
                {'menu_item_id': self.menu_item1.id, 'quantity': 2},
                {'menu_item_id': self.menu_item2.id, 'quantity': 1},
            ]
        }
        
        response = self.client.post('/api/v1/zesty/orders/', order_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'confirmed')
        self.assertEqual(len(response.data['items']), 2)
        self.assertEqual(response.data['special_instructions'], 'Extra cheese')

    def test_order_totals_calculated_correctly(self):
        """Test that order totals are calculated correctly."""
        self.client.force_authenticate(user=self.user)
        
        order_data = {
            'restaurant_id': self.restaurant.id,
            'delivery_address_id': self.address.id,
            'payment_method': 'credit_card',
            'items': [
                {'menu_item_id': self.menu_item1.id, 'quantity': 2},  # 299 * 2 = 598
            ]
        }
        
        response = self.client.post('/api/v1/zesty/orders/', order_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Subtotal: 598
        # Delivery fee: 50
        # Tax (5%): 598 * 0.05 = 29.90
        # Total: 598 + 50 + 29.90 = 677.90
        self.assertEqual(float(response.data['subtotal']), 598.00)
        self.assertEqual(float(response.data['delivery_fee']), 50.00)
        self.assertEqual(float(response.data['tax']), 29.90)
        self.assertEqual(float(response.data['total']), 677.90)

    def test_order_creates_payment_record(self):
        """Test that order creation creates a payment record."""
        self.client.force_authenticate(user=self.user)
        
        order_data = {
            'restaurant_id': self.restaurant.id,
            'delivery_address_id': self.address.id,
            'payment_method': 'credit_card',
            'items': [
                {'menu_item_id': self.menu_item1.id, 'quantity': 1},
            ]
        }
        
        response = self.client.post('/api/v1/zesty/orders/', order_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify payment was created
        from core.models import Payment
        payment = Payment.objects.get(object_id=response.data['id'], content_type='order')
        self.assertEqual(payment.status, 'completed')
        self.assertEqual(payment.method, 'credit_card')

    def test_order_creates_notification(self):
        """Test that order creation creates a notification."""
        self.client.force_authenticate(user=self.user)
        
        order_data = {
            'restaurant_id': self.restaurant.id,
            'delivery_address_id': self.address.id,
            'payment_method': 'credit_card',
            'items': [
                {'menu_item_id': self.menu_item1.id, 'quantity': 1},
            ]
        }
        
        response = self.client.post('/api/v1/zesty/orders/', order_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify notification was created
        from core.models import Notification
        notification = Notification.objects.get(related_id=response.data['id'], related_type='order')
        self.assertEqual(notification.type, 'order_status')
        self.assertEqual(notification.title, 'Order Confirmed')

    def test_order_creates_delivery_tracking(self):
        """Test that order creation creates delivery tracking."""
        self.client.force_authenticate(user=self.user)
        
        order_data = {
            'restaurant_id': self.restaurant.id,
            'delivery_address_id': self.address.id,
            'payment_method': 'credit_card',
            'items': [
                {'menu_item_id': self.menu_item1.id, 'quantity': 1},
            ]
        }
        
        response = self.client.post('/api/v1/zesty/orders/', order_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify delivery tracking was created
        order = Order.objects.get(id=response.data['id'])
        self.assertTrue(hasattr(order, 'tracking'))
        self.assertIsNotNone(order.tracking.eta)

    def test_cash_on_delivery_order_status_pending(self):
        """Test that COD orders start with pending status."""
        self.client.force_authenticate(user=self.user)
        
        order_data = {
            'restaurant_id': self.restaurant.id,
            'delivery_address_id': self.address.id,
            'payment_method': 'cash_on_delivery',
            'items': [
                {'menu_item_id': self.menu_item1.id, 'quantity': 1},
            ]
        }
        
        response = self.client.post('/api/v1/zesty/orders/', order_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'pending')

    def test_order_requires_items(self):
        """Test that order creation requires at least one item."""
        self.client.force_authenticate(user=self.user)
        
        order_data = {
            'restaurant_id': self.restaurant.id,
            'delivery_address_id': self.address.id,
            'payment_method': 'credit_card',
            'items': []
        }
        
        response = self.client.post('/api/v1/zesty/orders/', order_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_order_with_invalid_menu_item(self):
        """Test that order creation fails with invalid menu item."""
        self.client.force_authenticate(user=self.user)
        
        order_data = {
            'restaurant_id': self.restaurant.id,
            'delivery_address_id': self.address.id,
            'payment_method': 'credit_card',
            'items': [
                {'menu_item_id': 99999, 'quantity': 1},
            ]
        }
        
        response = self.client.post('/api/v1/zesty/orders/', order_data, format='json')
        
        self.assertEqual(response.status_code, 404)


class OrderListingTests(TestCase):
    """Test order listing and filtering."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='customer@test.com',
            username='customer',
            password='testpass123',
            role='customer'
        )
        self.owner = User.objects.create_user(
            email='owner@test.com',
            username='owner',
            password='testpass123',
            role='restaurant_owner'
        )
        
        self.restaurant = Restaurant.objects.create(
            owner=self.owner,
            name='Test Restaurant',
            cuisine_types='Italian',
            address='123 Test St',
            is_active=True
        )
        
        self.menu_item = MenuItem.objects.create(
            restaurant=self.restaurant,
            name='Pizza',
            price=Decimal('299.00'),
            category='Pizza',
            is_available=True
        )
        
        # Create multiple orders with different statuses
        self.order1 = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            status='pending'
        )
        OrderItem.objects.create(
            order=self.order1,
            menu_item=self.menu_item,
            quantity=1,
            unit_price=Decimal('299.00'),
            total=Decimal('299.00')
        )
        
        self.order2 = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            status='confirmed'
        )
        OrderItem.objects.create(
            order=self.order2,
            menu_item=self.menu_item,
            quantity=2,
            unit_price=Decimal('299.00'),
            total=Decimal('598.00')
        )
        
        self.order3 = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            status='delivered'
        )

    def test_list_user_orders(self):
        """Test listing user's orders."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/zesty/orders/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)

    def test_filter_orders_by_status(self):
        """Test filtering orders by status."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/zesty/orders/?status=pending')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['status'], 'pending')

    def test_retrieve_order_detail(self):
        """Test retrieving order details."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/v1/zesty/orders/{self.order1.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.order1.id)
        self.assertEqual(len(response.data['items']), 1)


class OrderCancellationTests(TestCase):
    """Test order cancellation."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='customer@test.com',
            username='customer',
            password='testpass123',
            role='customer'
        )
        self.owner = User.objects.create_user(
            email='owner@test.com',
            username='owner',
            password='testpass123',
            role='restaurant_owner'
        )
        
        self.restaurant = Restaurant.objects.create(
            owner=self.owner,
            name='Test Restaurant',
            cuisine_types='Italian',
            address='123 Test St',
            is_active=True
        )
        
        self.menu_item = MenuItem.objects.create(
            restaurant=self.restaurant,
            name='Pizza',
            price=Decimal('299.00'),
            category='Pizza',
            is_available=True
        )

    def test_cancel_pending_order(self):
        """Test cancelling a pending order."""
        order = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            status='pending'
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_item,
            quantity=1,
            unit_price=Decimal('299.00'),
            total=Decimal('299.00')
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(f'/api/v1/zesty/orders/{order.id}/cancel/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'cancelled')

    def test_cancel_confirmed_order(self):
        """Test cancelling a confirmed order."""
        from core.models import Payment
        
        order = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            status='confirmed'
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_item,
            quantity=1,
            unit_price=Decimal('299.00'),
            total=Decimal('299.00')
        )
        
        # Create payment
        payment = Payment.objects.create(
            user=self.user,
            amount=Decimal('299.00'),
            method='credit_card',
            status='completed',
            content_type='order',
            object_id=order.id
        )
        order.payment = payment
        order.save()
        
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(f'/api/v1/zesty/orders/{order.id}/cancel/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'cancelled')
        
        # Verify payment was refunded
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'refunded')

    def test_cannot_cancel_delivered_order(self):
        """Test that delivered orders cannot be cancelled."""
        order = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            status='delivered'
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_item,
            quantity=1,
            unit_price=Decimal('299.00'),
            total=Decimal('299.00')
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(f'/api/v1/zesty/orders/{order.id}/cancel/')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancel_order_creates_notification(self):
        """Test that cancelling an order creates a notification."""
        order = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            status='pending'
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_item,
            quantity=1,
            unit_price=Decimal('299.00'),
            total=Decimal('299.00')
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(f'/api/v1/zesty/orders/{order.id}/cancel/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify notification was created
        from core.models import Notification
        notification = Notification.objects.get(related_id=order.id, related_type='order')
        self.assertEqual(notification.title, 'Order Cancelled')


class OrderTrackingTests(TestCase):
    """Test order tracking."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='customer@test.com',
            username='customer',
            password='testpass123',
            role='customer'
        )
        self.owner = User.objects.create_user(
            email='owner@test.com',
            username='owner',
            password='testpass123',
            role='restaurant_owner'
        )
        
        self.restaurant = Restaurant.objects.create(
            owner=self.owner,
            name='Test Restaurant',
            cuisine_types='Italian',
            address='123 Test St',
            is_active=True
        )
        
        self.menu_item = MenuItem.objects.create(
            restaurant=self.restaurant,
            name='Pizza',
            price=Decimal('299.00'),
            category='Pizza',
            is_available=True
        )

    def test_get_order_tracking(self):
        """Test getting order tracking information."""
        order = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            status='out_for_delivery'
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_item,
            quantity=1,
            unit_price=Decimal('299.00'),
            total=Decimal('299.00')
        )
        
        # Create tracking
        DeliveryTracking.objects.create(
            order=order,
            delivery_partner_name='John Doe',
            delivery_partner_phone='+919876543210'
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/v1/zesty/orders/{order.id}/tracking/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['delivery_partner_name'], 'John Doe')
        self.assertEqual(response.data['order_status'], 'out_for_delivery')

    def test_tracking_creates_placeholder_if_not_exists(self):
        """Test that tracking endpoint creates placeholder if not exists."""
        order = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            status='confirmed'
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_item,
            quantity=1,
            unit_price=Decimal('299.00'),
            total=Decimal('299.00')
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/v1/zesty/orders/{order.id}/tracking/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('delivery_partner_name', response.data)
        
        # Verify tracking was created
        self.assertTrue(DeliveryTracking.objects.filter(order=order).exists())


class RestaurantReviewTests(TestCase):
    """Test restaurant review endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='customer@test.com',
            username='customer',
            password='testpass123',
            role='customer'
        )
        self.owner = User.objects.create_user(
            email='owner@test.com',
            username='owner',
            password='testpass123',
            role='restaurant_owner'
        )
        
        self.restaurant = Restaurant.objects.create(
            owner=self.owner,
            name='Test Restaurant',
            cuisine_types='Italian',
            address='123 Test St',
            is_active=True
        )
        
        self.menu_item = MenuItem.objects.create(
            restaurant=self.restaurant,
            name='Pizza',
            price=Decimal('299.00'),
            category='Pizza',
            is_available=True
        )

    def test_get_restaurant_reviews(self):
        """Test getting reviews for a restaurant."""
        # Create a review
        Review.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            rating=5,
            comment='Excellent food!'
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/v1/zesty/restaurants/{self.restaurant.id}/reviews/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['rating'], 5)
        self.assertEqual(response.data['results'][0]['comment'], 'Excellent food!')

    def test_create_review_requires_delivered_order(self):
        """Test that review creation requires a delivered order."""
        self.client.force_authenticate(user=self.user)
        
        review_data = {
            'rating': 5,
            'comment': 'Great food!'
        }
        
        response = self.client.post(
            f'/api/v1/zesty/restaurants/{self.restaurant.id}/reviews/',
            review_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('delivered', response.data['error'].lower())

    def test_create_review_with_delivered_order(self):
        """Test creating a review with a delivered order."""
        # Create a delivered order
        order = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            status='delivered'
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_item,
            quantity=1,
            unit_price=Decimal('299.00'),
            total=Decimal('299.00')
        )
        
        self.client.force_authenticate(user=self.user)
        
        review_data = {
            'rating': 5,
            'comment': 'Excellent food!'
        }
        
        response = self.client.post(
            f'/api/v1/zesty/restaurants/{self.restaurant.id}/reviews/',
            review_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['rating'], 5)
        self.assertEqual(response.data['comment'], 'Excellent food!')

    def test_review_creation_updates_restaurant_rating(self):
        """Test that review creation updates restaurant rating."""
        # Create a delivered order
        order = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            status='delivered'
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_item,
            quantity=1,
            unit_price=Decimal('299.00'),
            total=Decimal('299.00')
        )
        
        # Initial rating should be 0
        self.restaurant.refresh_from_db()
        self.assertEqual(self.restaurant.rating, 0)
        
        self.client.force_authenticate(user=self.user)
        
        review_data = {
            'rating': 5,
            'comment': 'Excellent food!'
        }
        
        response = self.client.post(
            f'/api/v1/zesty/restaurants/{self.restaurant.id}/reviews/',
            review_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify restaurant rating was updated
        self.restaurant.refresh_from_db()
        self.assertEqual(self.restaurant.rating, Decimal('5.00'))
        self.assertEqual(self.restaurant.review_count, 1)

    def test_multiple_reviews_update_average_rating(self):
        """Test that multiple reviews calculate average rating correctly."""
        # Create delivered orders for two users
        user2 = User.objects.create_user(
            email='customer2@test.com',
            username='customer2',
            password='testpass123',
            role='customer'
        )
        
        order1 = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            status='delivered'
        )
        OrderItem.objects.create(
            order=order1,
            menu_item=self.menu_item,
            quantity=1,
            unit_price=Decimal('299.00'),
            total=Decimal('299.00')
        )
        
        order2 = Order.objects.create(
            user=user2,
            restaurant=self.restaurant,
            status='delivered'
        )
        OrderItem.objects.create(
            order=order2,
            menu_item=self.menu_item,
            quantity=1,
            unit_price=Decimal('299.00'),
            total=Decimal('299.00')
        )
        
        # Create first review (5 stars)
        self.client.force_authenticate(user=self.user)
        review_data = {'rating': 5, 'comment': 'Excellent!'}
        response = self.client.post(
            f'/api/v1/zesty/restaurants/{self.restaurant.id}/reviews/',
            review_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Create second review (3 stars)
        self.client.force_authenticate(user=user2)
        review_data = {'rating': 3, 'comment': 'Good'}
        response = self.client.post(
            f'/api/v1/zesty/restaurants/{self.restaurant.id}/reviews/',
            review_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify average rating is 4.0
        self.restaurant.refresh_from_db()
        self.assertEqual(self.restaurant.rating, Decimal('4.00'))
        self.assertEqual(self.restaurant.review_count, 2)

    def test_one_review_per_user_per_restaurant(self):
        """Test that only one review per user per restaurant is allowed."""
        # Create a delivered order
        order = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            status='delivered'
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_item,
            quantity=1,
            unit_price=Decimal('299.00'),
            total=Decimal('299.00')
        )
        
        self.client.force_authenticate(user=self.user)
        
        # Create first review
        review_data = {'rating': 5, 'comment': 'Excellent!'}
        response = self.client.post(
            f'/api/v1/zesty/restaurants/{self.restaurant.id}/reviews/',
            review_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Try to create second review
        review_data = {'rating': 4, 'comment': 'Good'}
        response = self.client.post(
            f'/api/v1/zesty/restaurants/{self.restaurant.id}/reviews/',
            review_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already reviewed', response.data['error'].lower())

    def test_review_rating_validation(self):
        """Test that review rating is validated (1-5)."""
        # Create a delivered order
        order = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            status='delivered'
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_item,
            quantity=1,
            unit_price=Decimal('299.00'),
            total=Decimal('299.00')
        )
        
        self.client.force_authenticate(user=self.user)
        
        # Try invalid rating (0)
        review_data = {'rating': 0, 'comment': 'Bad'}
        response = self.client.post(
            f'/api/v1/zesty/restaurants/{self.restaurant.id}/reviews/',
            review_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Try invalid rating (6)
        review_data = {'rating': 6, 'comment': 'Bad'}
        response = self.client.post(
            f'/api/v1/zesty/restaurants/{self.restaurant.id}/reviews/',
            review_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_review_comment_optional(self):
        """Test that review comment is optional."""
        # Create a delivered order
        order = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            status='delivered'
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_item,
            quantity=1,
            unit_price=Decimal('299.00'),
            total=Decimal('299.00')
        )
        
        self.client.force_authenticate(user=self.user)
        
        # Create review without comment
        review_data = {'rating': 5}
        response = self.client.post(
            f'/api/v1/zesty/restaurants/{self.restaurant.id}/reviews/',
            review_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['rating'], 5)
        self.assertEqual(response.data['comment'], '')

    def test_review_requires_authentication(self):
        """Test that review creation requires authentication."""
        review_data = {'rating': 5, 'comment': 'Great!'}
        response = self.client.post(
            f'/api/v1/zesty/restaurants/{self.restaurant.id}/reviews/',
            review_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_review_pending_order_not_allowed(self):
        """Test that pending orders don't allow reviews."""
        # Create a pending order
        order = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            status='pending'
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_item,
            quantity=1,
            unit_price=Decimal('299.00'),
            total=Decimal('299.00')
        )
        
        self.client.force_authenticate(user=self.user)
        
        review_data = {'rating': 5, 'comment': 'Great!'}
        response = self.client.post(
            f'/api/v1/zesty/restaurants/{self.restaurant.id}/reviews/',
            review_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_review_confirmed_order_not_allowed(self):
        """Test that confirmed orders don't allow reviews."""
        # Create a confirmed order
        order = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            status='confirmed'
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_item,
            quantity=1,
            unit_price=Decimal('299.00'),
            total=Decimal('299.00')
        )
        
        self.client.force_authenticate(user=self.user)
        
        review_data = {'rating': 5, 'comment': 'Great!'}
        response = self.client.post(
            f'/api/v1/zesty/restaurants/{self.restaurant.id}/reviews/',
            review_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_review_user_name_in_response(self):
        """Test that review response includes user name."""
        # Create a delivered order
        order = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            status='delivered'
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_item,
            quantity=1,
            unit_price=Decimal('299.00'),
            total=Decimal('299.00')
        )
        
        self.client.force_authenticate(user=self.user)
        
        review_data = {'rating': 5, 'comment': 'Excellent!'}
        response = self.client.post(
            f'/api/v1/zesty/restaurants/{self.restaurant.id}/reviews/',
            review_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user_name', response.data)
        self.assertEqual(response.data['user_name'], self.user.email)
