from django.db import models
from django.utils import timezone
from urllib.parse import urlparse


class Scan(models.Model):
    """
    Represents a single website scan operation.
    Tracks lifecycle from queued to completed/failed.
    """

    STATUS_CHOICES = [
        ('QUEUED', 'Queued'),
        ('RUNNING', 'Running'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]

    # URL fields
    target_url = models.URLField(max_length=2048, help_text="Original URL provided by user")
    normalized_url = models.URLField(max_length=2048, help_text="Normalized/cleaned URL")
    final_url = models.URLField(max_length=2048, blank=True, help_text="Final URL after redirects")

    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='QUEUED')

    # Timing
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Results
    error_message = models.TextField(blank=True, help_text="Error details if scan failed")

    # Summary statistics (populated after scan completes)
    total_requests = models.IntegerField(default=0)
    unique_domains = models.IntegerField(default=0)
    first_party_domains = models.IntegerField(default=0)
    third_party_domains = models.IntegerField(default=0)
    total_size_bytes = models.BigIntegerField(default=0)
    duration_ms = models.IntegerField(default=0, help_text="Scan duration in milliseconds")

    # Resource type counts
    document_count = models.IntegerField(default=0)
    stylesheet_count = models.IntegerField(default=0)
    script_count = models.IntegerField(default=0)
    image_count = models.IntegerField(default=0)
    font_count = models.IntegerField(default=0)
    xhr_count = models.IntegerField(default=0)
    fetch_count = models.IntegerField(default=0)
    media_count = models.IntegerField(default=0)
    websocket_count = models.IntegerField(default=0)
    other_count = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Scan {self.id}: {self.target_url} ({self.status})"

    def mark_started(self):
        """Mark scan as started"""
        self.status = 'RUNNING'
        self.started_at = timezone.now()
        self.save(update_fields=['status', 'started_at'])

    def mark_completed(self):
        """Mark scan as successfully completed"""
        self.status = 'COMPLETED'
        self.completed_at = timezone.now()
        if self.started_at:
            duration = (self.completed_at - self.started_at).total_seconds() * 1000
            self.duration_ms = int(duration)
        self.save(update_fields=['status', 'completed_at', 'duration_ms'])

    def mark_failed(self, error_message: str):
        """Mark scan as failed with error message"""
        self.status = 'FAILED'
        self.completed_at = timezone.now()
        self.error_message = error_message
        self.save(update_fields=['status', 'completed_at', 'error_message'])

    @property
    def is_complete(self):
        """Check if scan is in a terminal state"""
        return self.status in ['COMPLETED', 'FAILED']


class Resource(models.Model):
    """
    Represents a single resource (request/response) captured during a scan.
    """

    RESOURCE_TYPE_CHOICES = [
        ('document', 'Document'),
        ('stylesheet', 'Stylesheet'),
        ('script', 'Script'),
        ('image', 'Image'),
        ('font', 'Font'),
        ('xhr', 'XHR'),
        ('fetch', 'Fetch'),
        ('media', 'Media'),
        ('websocket', 'WebSocket'),
        ('other', 'Other'),
    ]

    # Relationship
    scan = models.ForeignKey(Scan, on_delete=models.CASCADE, related_name='resources')

    # Request information
    url = models.URLField(max_length=2048)
    hostname = models.CharField(max_length=255, db_index=True)
    path = models.TextField()
    method = models.CharField(max_length=10, default='GET')
    resource_type = models.CharField(max_length=20, choices=RESOURCE_TYPE_CHOICES, db_index=True)

    # Response information
    status = models.IntegerField(null=True, blank=True)
    status_text = models.CharField(max_length=100, blank=True)
    content_type = models.CharField(max_length=200, blank=True)
    size_bytes = models.BigIntegerField(default=0)

    # Timing information
    start_time = models.FloatField(help_text="Unix timestamp when request started")
    duration_ms = models.IntegerField(default=0, help_text="Request duration in milliseconds")

    # Redirect information
    is_redirect = models.BooleanField(default=False)
    redirect_url = models.URLField(max_length=2048, blank=True)

    # Failure information
    failed = models.BooleanField(default=False)
    failure_text = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['start_time']
        indexes = [
            models.Index(fields=['scan', 'start_time']),
            models.Index(fields=['scan', 'resource_type']),
            models.Index(fields=['scan', 'hostname']),
        ]

    def __str__(self):
        return f"{self.method} {self.url} ({self.status})"

    @property
    def is_first_party(self):
        """Check if resource is from the same domain as the scan target"""
        if not self.scan.normalized_url:
            return False

        target_hostname = urlparse(self.scan.normalized_url).hostname
        return (
                self.hostname == target_hostname or
                self.hostname.endswith(f'.{target_hostname}')
        )


class Domain(models.Model):
    """
    Aggregated information about domains contacted during a scan.
    """

    # Relationship
    scan = models.ForeignKey(Scan, on_delete=models.CASCADE, related_name='domains')

    # Domain information
    hostname = models.CharField(max_length=255)
    is_first_party = models.BooleanField(default=False)

    # Statistics
    request_count = models.IntegerField(default=0)
    total_size_bytes = models.BigIntegerField(default=0)

    # Resource type breakdown
    document_count = models.IntegerField(default=0)
    stylesheet_count = models.IntegerField(default=0)
    script_count = models.IntegerField(default=0)
    image_count = models.IntegerField(default=0)
    font_count = models.IntegerField(default=0)
    xhr_count = models.IntegerField(default=0)
    other_count = models.IntegerField(default=0)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-request_count']
        unique_together = [['scan', 'hostname']]
        indexes = [
            models.Index(fields=['scan', '-request_count']),
            models.Index(fields=['scan', 'is_first_party']),
        ]

    def __str__(self):
        party_type = "1st party" if self.is_first_party else "3rd party"
        return f"{self.hostname} ({party_type}, {self.request_count} requests)"