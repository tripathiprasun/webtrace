"""
Technology Detection Engine
Identifies technologies, frameworks, and services based on observable patterns
"""
from typing import Dict, List, Set
import re


class TechnologySignature:
    """Represents a technology detection signature"""

    def __init__(self, name: str, category: str):
        self.name = name
        self.category = category
        self.url_patterns: List[str] = []
        self.header_patterns: Dict[str, str] = {}
        self.meta_patterns: Dict[str, str] = {}
        self.script_patterns: List[str] = []
        self.confidence = 'low'

    def add_url_pattern(self, pattern: str, confidence: str = 'medium'):
        """Add URL pattern for detection"""
        self.url_patterns.append(pattern)
        self.confidence = confidence
        return self

    def add_header_pattern(self, header: str, pattern: str):
        """Add header pattern for detection"""
        self.header_patterns[header.lower()] = pattern
        return self

    def add_script_pattern(self, pattern: str):
        """Add script URL pattern"""
        self.script_patterns.append(pattern)
        return self


class TechnologyDetector:
    """
    Detects technologies used by a website based on scan data.
    Uses deterministic signatures - no guessing.
    """

    def __init__(self):
        self.signatures = self._build_signatures()

    def _build_signatures(self) -> List[TechnologySignature]:
        """Build technology signature database"""
        sigs = []

        # JavaScript Frameworks
        sigs.append(
            TechnologySignature('React', 'JavaScript Framework')
            .add_url_pattern(r'react(-dom)?\..*\.js', 'high')
            .add_script_pattern(r'/_next/static/')
        )

        sigs.append(
            TechnologySignature('Vue.js', 'JavaScript Framework')
            .add_url_pattern(r'vue\..*\.js', 'high')
        )

        sigs.append(
            TechnologySignature('Angular', 'JavaScript Framework')
            .add_url_pattern(r'angular\..*\.js', 'high')
            .add_script_pattern(r'ng-.*\.js')
        )

        sigs.append(
            TechnologySignature('Next.js', 'React Framework')
            .add_url_pattern(r'/_next/', 'high')
            .add_script_pattern(r'/_next/static/')
        )

        sigs.append(
            TechnologySignature('Nuxt.js', 'Vue Framework')
            .add_url_pattern(r'/_nuxt/', 'high')
        )

        sigs.append(
            TechnologySignature('jQuery', 'JavaScript Library')
            .add_url_pattern(r'jquery([-.]\d+)?\..*\.js', 'high')
        )

        # CMS
        sigs.append(
            TechnologySignature('WordPress', 'CMS')
            .add_url_pattern(r'/wp-content/', 'high')
            .add_url_pattern(r'/wp-includes/', 'high')
        )

        sigs.append(
            TechnologySignature('Drupal', 'CMS')
            .add_url_pattern(r'/sites/default/', 'medium')
            .add_header_pattern('x-drupal-cache', r'.*')
        )

        sigs.append(
            TechnologySignature('Joomla', 'CMS')
            .add_url_pattern(r'/components/com_', 'high')
        )

        sigs.append(
            TechnologySignature('Shopify', 'E-commerce')
            .add_url_pattern(r'cdn\.shopify\.com', 'high')
            .add_url_pattern(r'\.myshopify\.com', 'high')
        )

        sigs.append(
            TechnologySignature('Wix', 'Website Builder')
            .add_url_pattern(r'static\.wixstatic\.com', 'high')
        )

        sigs.append(
            TechnologySignature('Squarespace', 'Website Builder')
            .add_url_pattern(r'\.squarespace\.com', 'high')
        )

        # CDN
        sigs.append(
            TechnologySignature('Cloudflare', 'CDN')
            .add_header_pattern('cf-ray', r'.*')
            .add_header_pattern('server', r'cloudflare')
        )

        sigs.append(
            TechnologySignature('Fastly', 'CDN')
            .add_header_pattern('x-served-by', r'.*fastly.*')
        )

        sigs.append(
            TechnologySignature('Amazon CloudFront', 'CDN')
            .add_header_pattern('x-amz-cf-id', r'.*')
            .add_url_pattern(r'cloudfront\.net', 'high')
        )

        sigs.append(
            TechnologySignature('Akamai', 'CDN')
            .add_header_pattern('x-akamai-staging', r'.*')
        )

        # Analytics
        sigs.append(
            TechnologySignature('Google Analytics', 'Analytics')
            .add_url_pattern(r'google-analytics\.com/analytics\.js', 'high')
            .add_url_pattern(r'googletagmanager\.com/gtag/', 'high')
            .add_script_pattern(r'gtag/js')
        )

        sigs.append(
            TechnologySignature('Google Tag Manager', 'Tag Manager')
            .add_url_pattern(r'googletagmanager\.com/gtm\.js', 'high')
        )

        sigs.append(
            TechnologySignature('Hotjar', 'Analytics')
            .add_url_pattern(r'static\.hotjar\.com', 'high')
        )

        sigs.append(
            TechnologySignature('Mixpanel', 'Analytics')
            .add_url_pattern(r'cdn\.mxpnl\.com', 'high')
        )

        sigs.append(
            TechnologySignature('Segment', 'Analytics')
            .add_url_pattern(r'cdn\.segment\.com', 'high')
        )

        # Advertising
        sigs.append(
            TechnologySignature('Google AdSense', 'Advertising')
            .add_url_pattern(r'googlesyndication\.com', 'high')
        )

        sigs.append(
            TechnologySignature('DoubleClick', 'Advertising')
            .add_url_pattern(r'doubleclick\.net', 'high')
        )

        # CSS Frameworks
        sigs.append(
            TechnologySignature('Bootstrap', 'CSS Framework')
            .add_url_pattern(r'bootstrap.*\.css', 'high')
            .add_url_pattern(r'bootstrap.*\.js', 'medium')
        )

        sigs.append(
            TechnologySignature('Tailwind CSS', 'CSS Framework')
            .add_url_pattern(r'tailwindcss', 'medium')
        )

        sigs.append(
            TechnologySignature('Font Awesome', 'Icon Library')
            .add_url_pattern(r'font-?awesome', 'high')
        )

        # Hosting/Servers
        sigs.append(
            TechnologySignature('Vercel', 'Hosting')
            .add_header_pattern('x-vercel-id', r'.*')
            .add_url_pattern(r'\.vercel\.app', 'high')
        )

        sigs.append(
            TechnologySignature('Netlify', 'Hosting')
            .add_header_pattern('x-nf-request-id', r'.*')
            .add_url_pattern(r'\.netlify\.app', 'high')
        )

        sigs.append(
            TechnologySignature('GitHub Pages', 'Hosting')
            .add_url_pattern(r'\.github\.io', 'high')
        )

        sigs.append(
            TechnologySignature('Nginx', 'Web Server')
            .add_header_pattern('server', r'nginx')
        )

        sigs.append(
            TechnologySignature('Apache', 'Web Server')
            .add_header_pattern('server', r'apache')
        )

        # Payment
        sigs.append(
            TechnologySignature('Stripe', 'Payment')
            .add_url_pattern(r'js\.stripe\.com', 'high')
        )

        sigs.append(
            TechnologySignature('PayPal', 'Payment')
            .add_url_pattern(r'paypal\.com.*\.js', 'high')
        )

        # Social
        sigs.append(
            TechnologySignature('Facebook Pixel', 'Social/Analytics')
            .add_url_pattern(r'connect\.facebook\.net', 'high')
        )

        sigs.append(
            TechnologySignature('Twitter Widget', 'Social')
            .add_url_pattern(r'platform\.twitter\.com', 'high')
        )

        # Backend Frameworks (harder to detect, based on patterns)
        sigs.append(
            TechnologySignature('Django', 'Backend Framework')
            .add_header_pattern('x-frame-options', r'DENY')  # Common Django default
        )

        sigs.append(
            TechnologySignature('Laravel', 'Backend Framework')
            .add_header_pattern('x-powered-by', r'PHP')
        )

        return sigs

    def detect(self, scan_data: Dict) -> List[Dict]:
        """
        Detect technologies from scan data.

        Args:
            scan_data: Scan results including events

        Returns:
            List of detected technologies with evidence
        """
        events = scan_data.get('events', [])
        detected = {}

        for sig in self.signatures:
            evidence = self._check_signature(sig, events)

            if evidence:
                detected[sig.name] = {
                    'name': sig.name,
                    'category': sig.category,
                    'confidence': sig.confidence,
                    'evidence': evidence,
                }

        return list(detected.values())

    def _check_signature(self, sig: TechnologySignature, events: List[Dict]) -> List[str]:
        """Check if signature matches any events"""
        evidence = []

        for event in events:
            url = event.get('url', '')

            # Check URL patterns
            for pattern in sig.url_patterns:
                if re.search(pattern, url, re.IGNORECASE):
                    evidence.append(f"URL pattern: {pattern}")
                    break

            # Check script patterns
            resource_type = event.get('resource_type', '')
            if resource_type in ['script', 'stylesheet']:
                for pattern in sig.script_patterns:
                    if re.search(pattern, url, re.IGNORECASE):
                        evidence.append(f"Script pattern: {pattern}")
                        break

            # Check headers (would need header data from scanner)
            # For now, we mainly use URL patterns

        return list(set(evidence))  # Remove duplicates