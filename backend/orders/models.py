from django.db import models


class Order(models.Model):
	STATUS_CHOICES = [
		('placed', 'Order Placed'),
		('confirmed', 'Confirmed by Restaurant'),
		('preparing', 'Preparing Your Food'),
		('out_for_delivery', 'Out for Delivery'),
		('delivered', 'Delivered'),
	]

	restaurant = models.ForeignKey('restaurants.Restaurant', on_delete=models.CASCADE)
	items = models.JSONField()  # [{ name, price, quantity }]
	subtotal = models.DecimalField(max_digits=10, decimal_places=2)
	gst = models.DecimalField(max_digits=10, decimal_places=2)
	platform_fee = models.DecimalField(max_digits=10, decimal_places=2)
	delivery_charge = models.DecimalField(max_digits=10, decimal_places=2)
	total = models.DecimalField(max_digits=10, decimal_places=2)
	status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='placed')
	created_at = models.DateTimeField(auto_now_add=True)
