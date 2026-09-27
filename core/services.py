"""
Business logic for scan operations.
"""
from django.utils import timezone
from datetime import timedelta

from .models import Scan
from .validators import URLValidator, URLValidationError


class ScanService:
    """Handles scan creation and management"""

    @staticmethod
    def create_scan(url: str) -> Scan:
        """
        Create a new scan from a URL.

        Args:
            url: Target URL to scan

        Returns:
            Created Scan instance

        Raises:
            URLValidationError: If URL validation fails
        """
        # Clean up old scans first (older than 1 hour)
        ScanService.cleanup_old_scans(hours=1)

        # Validate and normalize URL
        normalized_url = URLValidator.validate(url)

        # Create scan
        scan = Scan.objects.create(
            target_url=url,
            normalized_url=normalized_url,
            status='QUEUED'
        )

        return scan

    @staticmethod
    def cleanup_old_scans(hours: int = 1):
        """
        Delete scans older than specified hours.
        Keeps database small and clean.

        Args:
            hours: Delete scans older than this many hours
        """
        cutoff = timezone.now() - timedelta(hours=hours)
        deleted_count, _ = Scan.objects.filter(created_at__lt=cutoff).delete()
        if deleted_count > 0:
            print(f"Cleaned up {deleted_count} old scans")

    @staticmethod
    def get_scan(scan_id: int) -> Scan:
        """
        Retrieve a scan by ID.

        Args:
            scan_id: Scan ID

        Returns:
            Scan instance

        Raises:
            Scan.DoesNotExist: If scan not found
        """
        return Scan.objects.get(id=scan_id)