"""
Playwright-based browser scanning engine.
Captures network activity, resources, and timing information.
"""
from playwright.sync_api import sync_playwright, Page, Route, Request, Response
from typing import List, Dict, Optional
import time
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class NetworkEvent:
    """Represents a single network request/response"""

    def __init__(self):
        self.url: str = ""
        self.method: str = ""
        self.resource_type: str = ""
        self.status: Optional[int] = None
        self.status_text: str = ""
        self.content_type: str = ""
        self.size: int = 0
        self.start_time: float = 0
        self.end_time: float = 0
        self.duration: float = 0
        self.request_headers: Dict[str, str] = {}
        self.response_headers: Dict[str, str] = {}
        self.initiator_url: str = ""
        self.is_redirect: bool = False
        self.redirect_url: str = ""
        self.failed: bool = False
        self.failure_text: str = ""


class PlaywrightScanner:
    """
    Browser-based website scanner using Playwright.
    Observes network activity and captures resource information.
    """

    # Timeouts in milliseconds - INCREASED
    NAVIGATION_TIMEOUT = 60000   # 60 seconds (was 30)
    OVERALL_TIMEOUT = 120000     # 120 seconds (was 60)

    def __init__(self):
        self.events: List[NetworkEvent] = []
        self.scan_start_time: float = 0
        self.scan_end_time: float = 0
        self.page_url: str = ""
        self.final_url: str = ""  # After redirects

    def scan(self, url: str) -> Dict:
        """
        Scan a URL and capture network activity.

        Args:
            url: Target URL to scan

        Returns:
            Dictionary containing scan results

        Raises:
            Exception: If scan fails
        """
        self.events = []
        self.page_url = url
        self.scan_start_time = time.time()

        try:
            with sync_playwright() as playwright:
                # Launch browser
                browser = playwright.chromium.launch(
                    headless=True,
                    args=[
                        '--disable-dev-shm-usage',
                        '--no-sandbox',
                    ]
                )

                try:
                    # Create context with longer timeout
                    context = browser.new_context(
                        viewport={'width': 1920, 'height': 1080},
                        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 WebTrace/1.0',
                        ignore_https_errors=False,
                    )

                    # Set default timeout for context
                    context.set_default_navigation_timeout(self.NAVIGATION_TIMEOUT)
                    context.set_default_timeout(self.NAVIGATION_TIMEOUT)

                    # Create page
                    page = context.new_page()

                    # Set up network monitoring
                    self._setup_network_listeners(page)

                    # Navigate to URL
                    logger.info(f"Navigating to {url}")
                    response = page.goto(
                        url,
                        wait_until='networkidle',
                        timeout=self.NAVIGATION_TIMEOUT
                    )

                    # Store final URL (after redirects)
                    self.final_url = page.url

                    # Wait a bit for any delayed requests
                    page.wait_for_timeout(2000)

                    logger.info(f"Scan complete. Captured {len(self.events)} requests")

                finally:
                    browser.close()

            self.scan_end_time = time.time()

            # Process and return results
            return self._process_results()

        except Exception as e:
            self.scan_end_time = time.time()
            logger.error(f"Scan failed: {str(e)}")
            raise

    def _setup_network_listeners(self, page: Page):
        """Set up event listeners for network activity"""

        def on_request(request: Request):
            """Handle request event"""
            event = NetworkEvent()
            event.url = request.url
            event.method = request.method
            event.resource_type = request.resource_type
            event.start_time = time.time()
            event.request_headers = request.headers

            # Store event (will be updated on response)
            self.events.append(event)

        def on_response(response: Response):
            """Handle response event"""
            # Find matching request event
            matching_event = None
            for event in reversed(self.events):
                if event.url == response.url and event.end_time == 0:
                    matching_event = event
                    break

            if matching_event:
                matching_event.status = response.status
                matching_event.status_text = response.status_text
                matching_event.response_headers = response.headers
                matching_event.end_time = time.time()
                matching_event.duration = (matching_event.end_time - matching_event.start_time) * 1000  # ms

                # Get content type
                matching_event.content_type = response.headers.get('content-type', '')

                # Get size (estimate from content-length header)
                content_length = response.headers.get('content-length', '0')
                try:
                    matching_event.size = int(content_length)
                except (ValueError, TypeError):
                    matching_event.size = 0

                # Check for redirects
                if 300 <= response.status < 400:
                    matching_event.is_redirect = True
                    matching_event.redirect_url = response.headers.get('location', '')

        def on_request_failed(request: Request):
            """Handle failed request"""
            # Find matching event
            for event in reversed(self.events):
                if event.url == request.url and event.end_time == 0:
                    event.failed = True
                    event.failure_text = request.failure or "Unknown error"
                    event.end_time = time.time()
                    event.duration = (event.end_time - event.start_time) * 1000
                    break

        # Attach listeners
        page.on('request', on_request)
        page.on('response', on_response)
        page.on('requestfailed', on_request_failed)

    def _process_results(self) -> Dict:
        """
        Process captured events into structured results.

        Returns:
            Dictionary with scan results
        """
        from urllib.parse import urlparse

        # Calculate total duration
        total_duration_ms = int((self.scan_end_time - self.scan_start_time) * 1000)

        # Extract domains
        domains = set()
        for event in self.events:
            parsed = urlparse(event.url)
            if parsed.hostname:
                domains.add(parsed.hostname)

        # Count by resource type
        resource_types = {}
        for event in self.events:
            rt = event.resource_type or 'other'
            resource_types[rt] = resource_types.get(rt, 0) + 1

        # Calculate total size
        total_size = sum(event.size for event in self.events)

        # Classify domains as first-party vs third-party
        target_domain = urlparse(self.page_url).hostname
        first_party_domains = set()
        third_party_domains = set()

        for domain in domains:
            if domain == target_domain or domain.endswith(f'.{target_domain}'):
                first_party_domains.add(domain)
            else:
                third_party_domains.add(domain)

        # Build results
        results = {
            'success': True,
            'target_url': self.page_url,
            'final_url': self.final_url,
            'scan_duration_ms': total_duration_ms,
            'total_requests': len(self.events),
            'unique_domains': len(domains),
            'first_party_domains': len(first_party_domains),
            'third_party_domains': len(third_party_domains),
            'total_size_bytes': total_size,
            'resource_types': resource_types,
            'events': [self._serialize_event(e) for e in self.events],
            'domains': {
                'all': sorted(list(domains)),
                'first_party': sorted(list(first_party_domains)),
                'third_party': sorted(list(third_party_domains)),
            }
        }

        return results

    def _serialize_event(self, event: NetworkEvent) -> Dict:
        """Convert NetworkEvent to dictionary"""
        from urllib.parse import urlparse

        parsed = urlparse(event.url)

        return {
            'url': event.url,
            'hostname': parsed.hostname or '',
            'path': parsed.path or '/',
            'method': event.method,
            'resource_type': event.resource_type,
            'status': event.status,
            'status_text': event.status_text,
            'content_type': event.content_type,
            'size': event.size,
            'duration': int(event.duration),
            'start_time': event.start_time,
            'is_redirect': event.is_redirect,
            'redirect_url': event.redirect_url,
            'failed': event.failed,
            'failure_text': event.failure_text,
            'response_headers': event.response_headers,  # Add this
        }