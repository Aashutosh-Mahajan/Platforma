#!/usr/bin/env python3
"""
Create test data for integration testing
"""

import os
import django
from datetime import datetime, timedelta
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from eventra.models import Event, TicketType, Seat
from zesty.models import Restaurant, MenuItem

User = get_user_model()

def create_event_organizer():
    """Create an event organizer user"""
    email = "organizer@test.com"
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "username": "organizer",
            "first_name": "Event",
            "last_name": "Organizer",
            "role": "event_organizer",
            "phone": "+919876543210"
        }
    )
    if created:
        user.set_password("TestPass123!")
        user.save()
        print(f"✓ Created event organizer: {email}")
    else:
        print(f"ℹ Event organizer already exists: {email}")
    return user

def create_test_event(organizer):
    """Create a test event with tickets and seats"""
    event_date = datetime.now() + timedelta(days=30)
    event_end_date = event_date + timedelta(hours=3)
    
    event, created = Event.objects.get_or_create(
        name="Rock Concert 2026",
        defaults={
            "organizer": organizer,
            "description": "Amazing rock concert with live performances",
            "category": "concert",
            "venue_name": "Mumbai Arena",
            "address": "123 Concert Road, Mumbai, Maharashtra 400001",
            "event_date": event_date,
            "event_end_date": event_end_date,
            "is_published": True,
            "total_seats": 100,
            "available_seats": 100
        }
    )
    
    if created:
        print(f"✓ Created event: {event.name}")
        
        # Create ticket types
        standard_ticket = TicketType.objects.create(
            event=event,
            name="Standard",
            price=Decimal("1500.00"),
            quantity_total=80,
            quantity_available=80,
            description="Standard seating",
            benefits="General admission"
        )
        print(f"  ✓ Created ticket type: Standard")
        
        vip_ticket = TicketType.objects.create(
            event=event,
            name="VIP",
            price=Decimal("3500.00"),
            quantity_total=20,
            quantity_available=20,
            description="VIP seating",
            benefits="Premium seats, backstage access"
        )
        print(f"  ✓ Created ticket type: VIP")
        
        # Create seats
        sections = ["A", "B", "C", "D"]
        rows_per_section = 5
        seats_per_row = 5
        
        seat_count = 0
        for section in sections:
            for row in range(1, rows_per_section + 1):
                for seat_num in range(1, seats_per_row + 1):
                    # First 80 seats are standard, last 20 are VIP
                    ticket_type = standard_ticket if seat_count < 80 else vip_ticket
                    
                    Seat.objects.create(
                        event=event,
                        ticket_type=ticket_type,
                        section=f"Section {section}",
                        row=str(row),
                        seat_number=str(seat_num),
                        status="available"
                    )
                    seat_count += 1
        
        print(f"  ✓ Created {seat_count} seats")
    else:
        print(f"ℹ Event already exists: {event.name}")
    
    return event

def create_restaurant_owner():
    """Create a restaurant owner user"""
    email = "owner@test.com"
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "username": "owner",
            "first_name": "Restaurant",
            "last_name": "Owner",
            "role": "restaurant_owner",
            "phone": "+919876543211"
        }
    )
    if created:
        user.set_password("TestPass123!")
        user.save()
        print(f"✓ Created restaurant owner: {email}")
    else:
        print(f"ℹ Restaurant owner already exists: {email}")
    return user

def main():
    print("Creating test data for integration testing...\n")
    
    # Create event organizer and event
    organizer = create_event_organizer()
    event = create_test_event(organizer)
    
    # Create restaurant owner
    owner = create_restaurant_owner()
    
    print("\n✓ Test data creation complete!")
    print(f"\nEvent Organizer: organizer@test.com / TestPass123!")
    print(f"Restaurant Owner: owner@test.com / TestPass123!")

if __name__ == "__main__":
    main()
