from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order
from orders.serializers import OrderSerializer
from restaurants.models import Restaurant


class OrderCreateAPIView(APIView):
    def post(self, request):
        restaurant_id = request.data.get('restaurant_id')
        items = request.data.get('items')

        if restaurant_id is None:
            return Response({'detail': 'restaurant_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(items, list) or not items:
            return Response(
                {'detail': 'items must be a non-empty list.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        restaurant = get_object_or_404(Restaurant, id=restaurant_id)

        cleaned_items = []
        subtotal = Decimal('0.00')

        for index, item in enumerate(items, start=1):
            if not isinstance(item, dict):
                return Response(
                    {'detail': f'Item at position {index} must be an object.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            name = item.get('name')
            price = item.get('price')
            quantity = item.get('quantity')

            if not name:
                return Response(
                    {'detail': f'Item at position {index} must include name.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                price_decimal = Decimal(str(price))
            except (InvalidOperation, TypeError, ValueError):
                return Response(
                    {'detail': f'Item at position {index} has an invalid price.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                quantity_value = int(quantity)
            except (TypeError, ValueError):
                return Response(
                    {'detail': f'Item at position {index} has an invalid quantity.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if price_decimal < 0:
                return Response(
                    {'detail': f'Item at position {index} must have a non-negative price.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if quantity_value <= 0:
                return Response(
                    {'detail': f'Item at position {index} must have quantity greater than 0.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            normalized_price = price_decimal.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            line_total = normalized_price * quantity_value
            subtotal += line_total

            cleaned_items.append(
                {
                    'name': str(name),
                    'price': float(normalized_price),
                    'quantity': quantity_value,
                }
            )

        subtotal = subtotal.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        gst = (subtotal * Decimal('0.05')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        platform_fee = Decimal('5.00')
        delivery_charge = Decimal('30.00')
        total = (subtotal + gst + platform_fee + delivery_charge).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )

        order = Order.objects.create(
            restaurant=restaurant,
            items=cleaned_items,
            subtotal=subtotal,
            gst=gst,
            platform_fee=platform_fee,
            delivery_charge=delivery_charge,
            total=total,
        )

        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class OrderDetailAPIView(APIView):
    def get(self, request, order_id):
        order = get_object_or_404(Order, id=order_id)
        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)


class OrderStatusUpdateAPIView(APIView):
    def patch(self, request, order_id):
        order = get_object_or_404(Order, id=order_id)
        new_status = request.data.get('status')
        valid_statuses = [status_key for status_key, _label in Order.STATUS_CHOICES]

        if new_status not in valid_statuses:
            return Response(
                {'detail': f'status must be one of: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = new_status
        order.save(update_fields=['status'])

        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)
