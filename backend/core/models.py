from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model for Platforma."""

    ROLE_CHOICES = [
        ('customer', 'Customer'),
        ('restaurant_owner', 'Restaurant Owner'),
        ('event_organizer', 'Event Organizer'),
        ('delivery_partner', 'Delivery Partner'),
        ('admin', 'Administrator'),
    ]

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    restaurant_name = models.CharField(max_length=255, blank=True)
    company_name = models.CharField(max_length=255, blank=True)
    is_email_verified = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

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
    """User addresses for delivery."""

    LABEL_CHOICES = [
        ('home', 'Home'),
        ('work', 'Work'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    label = models.CharField(max_length=20, choices=LABEL_CHOICES, default='home')
    street = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'addresses'
        verbose_name_plural = 'Addresses'

    def __str__(self):
        return f"{self.label} - {self.street}, {self.city}"

    def save(self, *args, **kwargs):
        # If setting as default, unset other defaults for this user
        if self.is_default:
            Address.objects.filter(user=self.user, is_default=True).update(is_default=False)
        super().save(*args, **kwargs)


class Payment(models.Model):
    """Simulated payment records."""

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
        ('cash_on_delivery', 'Cash on Delivery'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='credit_card')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Simulated transaction reference
    transaction_id = models.CharField(max_length=255, unique=True, null=True, blank=True)

    # Generic link to order or booking
    content_type = models.CharField(max_length=50, blank=True)  # 'order' or 'booking'
    object_id = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment #{self.id} - ₹{self.amount} ({self.status})"

    def simulate_payment(self):
        """Simulate a payment — always succeeds in dev."""
        import uuid
        self.transaction_id = f"SIM-{uuid.uuid4().hex[:12].upper()}"
        self.status = 'completed'
        self.save()
        return self


class VerificationToken(models.Model):
    """Time-limited, single-use token for email verification (FR-A1) and
    password reset (FR-A5). One model serves both — `purpose` distinguishes
    them so a verification link can never be replayed to reset a password.
    """

    PURPOSE_CHOICES = [
        ('email_verify', 'Email Verification'),
        ('password_reset', 'Password Reset'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='verification_tokens')
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES)
    token = models.CharField(max_length=64, unique=True, editable=False)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'verification_tokens'
        indexes = [models.Index(fields=['token'])]

    def __str__(self):
        return f"{self.purpose} token for {self.user_id}"

    def save(self, *args, **kwargs):
        if not self.token:
            import uuid
            self.token = uuid.uuid4().hex
        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        from django.utils import timezone
        return self.used_at is None and timezone.now() < self.expires_at

    @classmethod
    def issue(cls, user, purpose, lifetime_hours=24):
        from django.utils import timezone
        from datetime import timedelta
        return cls.objects.create(
            user=user, purpose=purpose,
            expires_at=timezone.now() + timedelta(hours=lifetime_hours),
        )


class EmailCode(models.Model):
    """A short-lived 6-digit code sent by email, for verifying an address or
    resetting a password.

    Only a keyed hash of the code is stored, never the digits themselves.
    Each code allows a handful of guesses before it is burned, and issuing a
    new code retires any earlier live code for the same user and purpose.
    """

    PURPOSE_CHOICES = [
        ('email_verify', 'Email Verification'),
        ('password_reset', 'Password Reset'),
    ]
    LIFETIME_MINUTES = 10
    MAX_ATTEMPTS = 5
    RESEND_COOLDOWN_SECONDS = 60

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_codes')
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES)
    code_hash = models.CharField(max_length=64)
    attempts = models.PositiveSmallIntegerField(default=0)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'email_codes'
        indexes = [models.Index(fields=['user', 'purpose', 'created_at'])]

    def __str__(self):
        return f"{self.purpose} code for {self.user_id}"

    @staticmethod
    def _hash(user_id, purpose, code):
        import hashlib
        import hmac
        from django.conf import settings
        message = f'{user_id}:{purpose}:{code}'.encode()
        return hmac.new(settings.SECRET_KEY.encode(), message, hashlib.sha256).hexdigest()

    @property
    def is_live(self):
        from django.utils import timezone
        return self.used_at is None and self.attempts < self.MAX_ATTEMPTS and timezone.now() < self.expires_at

    @classmethod
    def issue(cls, user, purpose):
        """Create a fresh code and return (instance, plain_code)."""
        import secrets
        from datetime import timedelta
        from django.utils import timezone
        now = timezone.now()
        cls.objects.filter(user=user, purpose=purpose, used_at__isnull=True).update(used_at=now)
        code = f'{secrets.randbelow(1_000_000):06d}'
        instance = cls.objects.create(
            user=user, purpose=purpose, code_hash=cls._hash(user.pk, purpose, code),
            expires_at=now + timedelta(minutes=cls.LIFETIME_MINUTES),
        )
        return instance, code

    @classmethod
    def seconds_until_resend(cls, user, purpose):
        from django.utils import timezone
        latest = cls.objects.filter(user=user, purpose=purpose).order_by('-created_at').first()
        if not latest:
            return 0
        elapsed = (timezone.now() - latest.created_at).total_seconds()
        return max(0, int(cls.RESEND_COOLDOWN_SECONDS - elapsed))

    @classmethod
    def verify(cls, user, purpose, code):
        """Validate a submitted code. Returns (ok, reason) where reason is one
        of 'invalid', 'expired', 'too_many_attempts' on failure."""
        import hmac
        from django.utils import timezone
        live = cls.objects.filter(user=user, purpose=purpose, used_at__isnull=True).order_by('-created_at').first()
        if live is None or timezone.now() >= live.expires_at:
            return False, 'expired'
        if live.attempts >= cls.MAX_ATTEMPTS:
            return False, 'too_many_attempts'
        if not hmac.compare_digest(live.code_hash, cls._hash(user.pk, purpose, str(code).strip())):
            live.attempts += 1
            live.save(update_fields=['attempts'])
            return False, 'too_many_attempts' if live.attempts >= cls.MAX_ATTEMPTS else 'invalid'
        live.used_at = timezone.now()
        live.save(update_fields=['used_at'])
        return True, None


class AuditLog(models.Model):
    """Immutable log of every admin action (PRD FR-D5).

    Rows are never updated or deleted by application code — only created.
    `target_type`/`target_id` mirror Payment's lightweight polymorphic
    pattern rather than pulling in django.contrib.contenttypes, since the
    rest of this codebase already uses that convention.
    """

    actor = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='audit_log_entries'
    )
    action = models.CharField(max_length=100)
    target_type = models.CharField(max_length=50, blank=True)
    target_id = models.CharField(max_length=64, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_log'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['target_type', 'target_id']),
            models.Index(fields=['actor']),
        ]

    def __str__(self):
        return f"{self.actor} {self.action} {self.target_type}:{self.target_id} @ {self.created_at}"

    @classmethod
    def record(cls, actor, action, target_type='', target_id='', **metadata):
        return cls.objects.create(
            actor=actor, action=action, target_type=target_type,
            target_id=str(target_id), metadata=metadata,
        )


class SearchLog(models.Model):
    """Search funnel logging (PRD FR-S6 / NFR-Pr1).

    Carries `session_id` only — never a user id or other account
    identifier — so clickstream analysis can't be traced back to a person.
    """

    session_id = models.CharField(max_length=64)
    query_text = models.CharField(max_length=255)
    result_type = models.CharField(max_length=20, blank=True)
    result_id = models.CharField(max_length=64, blank=True)
    clicked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'search_log'
        indexes = [
            models.Index(fields=['session_id']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"'{self.query_text}' ({self.session_id[:8]})"


class Notification(models.Model):
    """User notifications for orders, bookings, etc."""

    TYPE_CHOICES = [
        ('order_status', 'Order Status'),
        ('booking_confirmation', 'Booking Confirmation'),
        ('event_reminder', 'Event Reminder'),
        ('promotion', 'Promotion'),
        ('system', 'System'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='system')
    title = models.CharField(max_length=255)
    message = models.TextField()
    related_id = models.IntegerField(null=True, blank=True)
    related_type = models.CharField(max_length=50, blank=True)  # 'order', 'booking'
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} → {self.user.email}"
