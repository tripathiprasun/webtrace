"""
Scan execution service.
Manages the lifecycle of running scans.
"""
from .models import Scan
from .scanner import PlaywrightScanner
from .aggregator import ScanAggregator
import logging

logger = logging.getLogger(__name__)


class ScanExecutor:
    """Executes scans and updates scan models"""

    @staticmethod
    def execute_scan(scan: Scan) -> bool:
        """
        Execute a scan using Playwright.
        Updates the Scan model with results.

        Args:
            scan: Scan instance to execute

        Returns:
            True if successful, False otherwise
        """
        try:
            # Mark as started
            scan.mark_started()
            logger.info(f"Starting scan {scan.id} for {scan.normalized_url}")

            # Run scanner
            scanner = PlaywrightScanner()
            results = scanner.scan(scan.normalized_url)

            # Update scan with basic info
            scan.final_url = results['final_url']
            scan.total_requests = results['total_requests']
            scan.unique_domains = results['unique_domains']
            scan.total_size_bytes = results['total_size_bytes']
            scan.save()

            # Aggregate detailed results into database
            logger.info(f"Aggregating {len(results['events'])} events for scan {scan.id}")
            ScanAggregator.aggregate_scan(scan, results['events'])

            # Mark as complete
            scan.mark_completed()

            logger.info(f"Scan {scan.id} completed successfully")
            return True

        except Exception as e:
            error_message = f"Scan failed: {str(e)}"
            logger.error(f"Scan {scan.id} failed: {error_message}")
            scan.mark_failed(error_message)
            return False