#!/usr/bin/env python3
"""
Integration Test Script for Platforma
Tests all major user flows end-to-end
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "http://127.0.0.1:8000/api/v1"
FRONTEND_URL = "http://localhost:5173"

# Test data storage
test_data = {
    "tokens": {},
    "users": {},
    "addresses": {},
    "restaurants": {},
    "orders": {},
    "events": {},
    "bookings": {},
}

# Color codes for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def log_success(message: str):
    print(f"{Colors.GREEN}✓ {message}{Colors.END}")

def log_error(message: str):
    print(f"{Colors.RED}✗ {message}{Colors.END}")

def log_info(message: str):
    print(f"{Colors.BLUE}ℹ {message}{Colors.END}")

def log_warning(message: str):
    print(f"{Colors.YELLOW}⚠ {message}{Colors.END}")

def log_section(message: str):
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"  {message}")
    print(f"{'='*60}{Colors.END}\n")

# Helper functions
def make_request(method: str, endpoint: str, data: Optional[Dict] = None, 
                 token: Optional[str] = None, params: Optional[Dict] = None) -> requests.Response:
    """Make HTTP request with optional authentication"""
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, params=params)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)
        elif method == "PATCH":
            response = requests.patch(url, headers=headers, json=data)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except requests.exceptions.RequestException as e:
        log_error(f"Request failed: {e}")
        raise

# Test Flow 1: Registration → Login → Profile Update
def test_auth_flow():
    log_section("Flow 1: Registration → Login → Profile Update")
    
    # Test registration
    log_info("Testing user registration...")
    register_data = {
        "email": f"testuser_{int(time.time())}@example.com",
        "username": f"testuser_{int(time.time())}",
        "password": "TestPass123!",
        "password_confirm": "TestPass123!",
        "first_name": "Test",
        "last_name": "User",
        "phone": "+919876543210",
        "role": "customer"
    }
    
    response = make_request("POST", "/auth/register/", register_data)
    
    if response.status_code == 201:
        log_success("Registration successful")
        data = response.json()
        test_data["users"]["customer"] = data.get("user", {})
        test_data["tokens"]["customer"] = data.get("tokens", {})
        log_info(f"User ID: {test_data['users']['customer'].get('id')}")
    else:
        log_error(f"Registration failed: {response.status_code} - {response.text}")
        return False
    
    # Test login
    log_info("Testing user login...")
    login_data = {
        "email": register_data["email"],
        "password": register_data["password"]
    }
    
    response = make_request("POST", "/auth/login/", login_data)
    
    if response.status_code == 200:
        log_success("Login successful")
        tokens = response.json()
        test_data["tokens"]["customer"] = tokens
    else:
        log_error(f"Login failed: {response.status_code} - {response.text}")
        return False
    
    # Test profile retrieval
    log_info("Testing profile retrieval...")
    token = test_data["tokens"]["customer"]["access"]
    response = make_request("GET", "/users/profile/", token=token)
    
    if response.status_code == 200:
        log_success("Profile retrieved successfully")
        profile = response.json()
        log_info(f"Profile: {profile.get('first_name')} {profile.get('last_name')}")
    else:
        log_error(f"Profile retrieval failed: {response.status_code} - {response.text}")
        return False
    
    # Test profile update
    log_info("Testing profile update...")
    update_data = {
        "first_name": "Updated",
        "last_name": "Name"
    }
    
    response = make_request("PATCH", "/users/profile/", update_data, token=token)
    
    if response.status_code == 200:
        log_success("Profile updated successfully")
        updated_profile = response.json()
        if updated_profile.get("first_name") == "Updated":
            log_success("Profile changes verified")
        else:
            log_error("Profile changes not reflected")
            return False
    else:
        log_error(f"Profile update failed: {response.status_code} - {response.text}")
        return False
    
    return True

# Test Flow 2: Restaurant Browsing → Order Creation
def test_restaurant_order_flow():
    log_section("Flow 2: Restaurant Browsing → Menu → Cart → Order")
    
    token = test_data["tokens"]["customer"]["access"]
    
    # Test restaurant listing
    log_info("Testing restaurant listing...")
    response = make_request("GET", "/zesty/restaurants/", token=token)
    
    if response.status_code == 200:
        log_success("Restaurant listing retrieved")
        data = response.json()
        restaurants = data.get("results", [])
        if restaurants:
            test_data["restaurants"]["selected"] = restaurants[0]
            log_info(f"Selected restaurant: {restaurants[0].get('name')}")
        else:
            log_warning("No restaurants found in database")
            return False
    else:
        log_error(f"Restaurant listing failed: {response.status_code} - {response.text}")
        return False
    
    # Test restaurant detail
    restaurant_id = test_data["restaurants"]["selected"]["id"]
    log_info(f"Testing restaurant detail for ID {restaurant_id}...")
    response = make_request("GET", f"/zesty/restaurants/{restaurant_id}/", token=token)
    
    if response.status_code == 200:
        log_success("Restaurant detail retrieved")
        restaurant = response.json()
        menu_items = restaurant.get("menu_items", [])
        if menu_items:
            log_info(f"Found {len(menu_items)} menu items")
            test_data["restaurants"]["menu_items"] = menu_items
        else:
            log_warning("No menu items found")
            return False
    else:
        log_error(f"Restaurant detail failed: {response.status_code} - {response.text}")
        return False
    
    # Create address for delivery
    log_info("Creating delivery address...")
    address_data = {
        "label": "home",
        "street": "123 Test Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "postal_code": "400001",
        "is_default": True
    }
    
    response = make_request("POST", "/users/addresses/", address_data, token=token)
    
    if response.status_code == 201:
        log_success("Address created")
        address = response.json()
        test_data["addresses"]["delivery"] = address
    else:
        log_error(f"Address creation failed: {response.status_code} - {response.text}")
        return False
    
    # Create order
    log_info("Creating order...")
    menu_item = test_data["restaurants"]["menu_items"][0]
    order_data = {
        "restaurant_id": restaurant_id,
        "delivery_address_id": test_data["addresses"]["delivery"]["id"],
        "special_instructions": "Test order",
        "payment_method": "credit_card",
        "items": [
            {
                "menu_item_id": menu_item["id"],
                "quantity": 2
            }
        ]
    }
    
    response = make_request("POST", "/zesty/orders/", order_data, token=token)
    
    if response.status_code == 201:
        log_success("Order created successfully")
        order = response.json()
        test_data["orders"]["test_order"] = order
        log_info(f"Order ID: {order.get('id')}, Total: {order.get('total')}")
    else:
        log_error(f"Order creation failed: {response.status_code} - {response.text}")
        return False
    
    # Test order tracking
    order_id = test_data["orders"]["test_order"]["id"]
    log_info(f"Testing order tracking for order {order_id}...")
    response = make_request("GET", f"/zesty/orders/{order_id}/tracking/", token=token)
    
    if response.status_code == 200:
        log_success("Order tracking retrieved")
        tracking = response.json()
        log_info(f"Order status: {tracking.get('order_status')}")
    else:
        log_error(f"Order tracking failed: {response.status_code} - {response.text}")
        return False
    
    return True

# Test Flow 3: Event Browsing → Booking Creation
def test_event_booking_flow():
    log_section("Flow 3: Event Browsing → Seat Selection → Booking")
    
    token = test_data["tokens"]["customer"]["access"]
    
    # Test event listing
    log_info("Testing event listing...")
    response = make_request("GET", "/eventra/events/", token=token)
    
    if response.status_code == 200:
        log_success("Event listing retrieved")
        data = response.json()
        events = data.get("results", [])
        if events:
            # Find an event with available seats
            for event in events:
                if event.get("available_seats", 0) > 0:
                    test_data["events"]["selected"] = event
                    log_info(f"Selected event: {event.get('name')}")
                    break
            
            if "selected" not in test_data["events"]:
                log_warning("No events with available seats found")
                return False
        else:
            log_warning("No events found in database")
            return False
    else:
        log_error(f"Event listing failed: {response.status_code} - {response.text}")
        return False
    
    # Test event detail
    event_id = test_data["events"]["selected"]["id"]
    log_info(f"Testing event detail for ID {event_id}...")
    response = make_request("GET", f"/eventra/events/{event_id}/", token=token)
    
    if response.status_code == 200:
        log_success("Event detail retrieved")
        event = response.json()
        ticket_types = event.get("ticket_types", [])
        if ticket_types:
            log_info(f"Found {len(ticket_types)} ticket types")
            test_data["events"]["ticket_types"] = ticket_types
        else:
            log_warning("No ticket types found")
            return False
    else:
        log_error(f"Event detail failed: {response.status_code} - {response.text}")
        return False
    
    # Test seat map
    log_info("Testing seat map...")
    response = make_request("GET", f"/eventra/events/{event_id}/seats/", token=token)
    
    if response.status_code == 200:
        log_success("Seat map retrieved")
        seat_data = response.json()
        sections = seat_data.get("sections", [])
        
        # Find available seats
        available_seats = []
        for section in sections:
            for seat in section.get("seats", []):
                if seat.get("status") == "available":
                    available_seats.append(seat)
                    if len(available_seats) >= 2:
                        break
            if len(available_seats) >= 2:
                break
        
        if available_seats:
            log_info(f"Found {len(available_seats)} available seats")
            test_data["events"]["selected_seats"] = available_seats
        else:
            log_warning("No available seats found")
            return False
    else:
        log_error(f"Seat map retrieval failed: {response.status_code} - {response.text}")
        return False
    
    # Create booking
    log_info("Creating booking...")
    ticket_type = test_data["events"]["ticket_types"][0]
    selected_seats = test_data["events"]["selected_seats"]
    
    booking_data = {
        "event_id": event_id,
        "payment_method": "credit_card",
        "tickets": [
            {
                "ticket_type_id": ticket_type["id"],
                "quantity": len(selected_seats),
                "seats": [seat["id"] for seat in selected_seats]
            }
        ]
    }
    
    response = make_request("POST", "/eventra/bookings/", booking_data, token=token)
    
    if response.status_code == 201:
        log_success("Booking created successfully")
        booking = response.json()
        test_data["bookings"]["test_booking"] = booking
        log_info(f"Booking Reference: {booking.get('booking_reference')}, Total: {booking.get('total')}")
    else:
        log_error(f"Booking creation failed: {response.status_code} - {response.text}")
        return False
    
    return True

# Test Flow 4: Order Cancellation
def test_order_cancellation():
    log_section("Flow 4: Order Cancellation and Refund")
    
    if "test_order" not in test_data["orders"]:
        log_warning("No test order available for cancellation")
        return False
    
    token = test_data["tokens"]["customer"]["access"]
    order_id = test_data["orders"]["test_order"]["id"]
    
    log_info(f"Testing order cancellation for order {order_id}...")
    response = make_request("PATCH", f"/zesty/orders/{order_id}/cancel/", token=token)
    
    if response.status_code == 200:
        log_success("Order cancelled successfully")
        cancelled_order = response.json()
        if cancelled_order.get("status") == "cancelled":
            log_success("Order status verified as cancelled")
        else:
            log_error(f"Order status is {cancelled_order.get('status')}, expected 'cancelled'")
            return False
    else:
        log_error(f"Order cancellation failed: {response.status_code} - {response.text}")
        return False
    
    return True

# Test Flow 5: Booking Cancellation
def test_booking_cancellation():
    log_section("Flow 5: Booking Cancellation and Refund")
    
    if "test_booking" not in test_data["bookings"]:
        log_warning("No test booking available for cancellation")
        return False
    
    token = test_data["tokens"]["customer"]["access"]
    booking_id = test_data["bookings"]["test_booking"]["id"]
    
    log_info(f"Testing booking cancellation for booking {booking_id}...")
    response = make_request("PATCH", f"/eventra/bookings/{booking_id}/cancel/", token=token)
    
    if response.status_code == 200:
        log_success("Booking cancelled successfully")
        result = response.json()
        booking = result.get("booking", {})
        if booking.get("status") == "cancelled":
            log_success("Booking status verified as cancelled")
            log_info(f"Refund amount: {result.get('refund_amount')}")
        else:
            log_error(f"Booking status is {booking.get('status')}, expected 'cancelled'")
            return False
    else:
        log_error(f"Booking cancellation failed: {response.status_code} - {response.text}")
        return False
    
    return True

# Test Flow 9: Notification System
def test_notifications():
    log_section("Flow 9: Notification System")
    
    token = test_data["tokens"]["customer"]["access"]
    
    # Test notification listing
    log_info("Testing notification listing...")
    response = make_request("GET", "/notifications/", token=token)
    
    if response.status_code == 200:
        log_success("Notifications retrieved")
        data = response.json()
        notifications = data.get("results", [])
        log_info(f"Found {len(notifications)} notifications")
        
        if notifications:
            test_data["notifications"] = notifications
            
            # Test mark as read
            notification_id = notifications[0]["id"]
            log_info(f"Testing mark notification {notification_id} as read...")
            response = make_request("PATCH", f"/notifications/{notification_id}/mark_read/", token=token)
            
            if response.status_code == 200:
                log_success("Notification marked as read")
            else:
                log_error(f"Mark as read failed: {response.status_code} - {response.text}")
                return False
    else:
        log_error(f"Notification listing failed: {response.status_code} - {response.text}")
        return False
    
    return True

# Main test runner
def run_all_tests():
    log_section("PLATFORMA INTEGRATION TESTS")
    log_info(f"Backend URL: {BASE_URL}")
    log_info(f"Frontend URL: {FRONTEND_URL}")
    log_info(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "skipped": 0
    }
    
    tests = [
        ("Flow 1: Auth", test_auth_flow),
        ("Flow 2: Restaurant Order", test_restaurant_order_flow),
        ("Flow 3: Event Booking", test_event_booking_flow),
        ("Flow 4: Order Cancellation", test_order_cancellation),
        ("Flow 5: Booking Cancellation", test_booking_cancellation),
        ("Flow 9: Notifications", test_notifications),
    ]
    
    for test_name, test_func in tests:
        results["total"] += 1
        try:
            if test_func():
                results["passed"] += 1
            else:
                results["failed"] += 1
        except Exception as e:
            log_error(f"Test {test_name} crashed: {e}")
            results["failed"] += 1
    
    # Print summary
    log_section("TEST SUMMARY")
    log_info(f"Total Tests: {results['total']}")
    log_success(f"Passed: {results['passed']}")
    log_error(f"Failed: {results['failed']}")
    log_warning(f"Skipped: {results['skipped']}")
    
    pass_rate = (results['passed'] / results['total'] * 100) if results['total'] > 0 else 0
    log_info(f"Pass Rate: {pass_rate:.1f}%")
    
    return results

if __name__ == "__main__":
    try:
        results = run_all_tests()
        exit(0 if results["failed"] == 0 else 1)
    except KeyboardInterrupt:
        log_warning("\nTests interrupted by user")
        exit(1)
    except Exception as e:
        log_error(f"Test suite crashed: {e}")
        exit(1)
