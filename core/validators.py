"""
URL validation and normalization for WebTrace scans.
Security-focused validation to prevent scanning dangerous targets.
"""
from urllib.parse import urlparse, urlunparse
import ipaddress


class URLValidationError(Exception):
    """Raised when URL validation fails"""
    pass


class URLValidator:
    """
    Validates and normalizes URLs for scanning.
    Blocks dangerous targets like localhost, internal networks, and non-HTTP schemes.
    """

    BLOCKED_SCHEMES = ['file', 'data', 'javascript', 'ftp', 'blob']
    ALLOWED_SCHEMES = ['https']  # Only HTTPS for now

    BLOCKED_HOSTS = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
    ]

    # Private IP ranges (RFC 1918)
    PRIVATE_IP_RANGES = [
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16',
        '169.254.0.0/16',  # Link-local
        'fc00::/7',  # IPv6 unique local
        'fe80::/10',  # IPv6 link-local
    ]

    @classmethod
    def validate(cls, url: str) -> str:
        """
        Validate and normalize a URL.

        Args:
            url: The URL to validate

        Returns:
            Normalized URL string

        Raises:
            URLValidationError: If URL is invalid or blocked
        """
        if not url or not isinstance(url, str):
            raise URLValidationError("URL is required")

        url = url.strip()

        if not url:
            raise URLValidationError("URL cannot be empty")

        # Parse URL
        try:
            parsed = urlparse(url)
        except Exception as e:
            raise URLValidationError(f"Invalid URL format: {str(e)}")

        # Check scheme
        if not parsed.scheme:
            raise URLValidationError("URL must include a scheme (https://)")

        if parsed.scheme.lower() in cls.BLOCKED_SCHEMES:
            raise URLValidationError(f"Scheme '{parsed.scheme}' is not allowed")

        if parsed.scheme.lower() not in cls.ALLOWED_SCHEMES:
            raise URLValidationError(f"Only HTTPS URLs are supported")

        # Check host
        if not parsed.netloc:
            raise URLValidationError("URL must include a hostname")

        hostname = parsed.hostname
        if not hostname:
            raise URLValidationError("Invalid hostname")

        # Check for blocked hosts
        if hostname.lower() in cls.BLOCKED_HOSTS:
            raise URLValidationError(f"Cannot scan localhost or loopback addresses")

        # Check for IP addresses (and validate they're not private)
        if cls._is_ip_address(hostname):
            if cls._is_private_ip(hostname):
                raise URLValidationError("Cannot scan private IP addresses")

        # Check for obvious internal hostnames
        if '.' not in hostname:
            raise URLValidationError("Hostname must be a valid domain")

        # Normalize URL
        normalized = cls._normalize_url(parsed)

        return normalized

    @classmethod
    def _is_ip_address(cls, hostname: str) -> bool:
        """Check if hostname is an IP address"""
        try:
            ipaddress.ip_address(hostname)
            return True
        except ValueError:
            return False

    @classmethod
    def _is_private_ip(cls, ip_str: str) -> bool:
        """Check if IP address is in private range"""
        try:
            ip = ipaddress.ip_address(ip_str)
            return any(
                ip in ipaddress.ip_network(network)
                for network in cls.PRIVATE_IP_RANGES
            )
        except ValueError:
            return False

    @classmethod
    def _normalize_url(cls, parsed) -> str:
        """
        Normalize a parsed URL.
        - Lowercase scheme and hostname
        - Remove default ports
        - Remove fragment
        """
        scheme = parsed.scheme.lower()
        netloc = parsed.netloc.lower()

        # Remove default ports
        if ':443' in netloc and scheme == 'https':
            netloc = netloc.replace(':443', '')
        elif ':80' in netloc and scheme == 'http':
            netloc = netloc.replace(':80', '')

        # Reconstruct without fragment
        normalized = urlunparse((
            scheme,
            netloc,
            parsed.path or '/',
            parsed.params,
            parsed.query,
            ''  # No fragment
        ))

        return normalized