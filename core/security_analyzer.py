"""
Security Header Analyzer
Inspects HTTP security headers and reports observable facts
Does NOT make security claims or vulnerability assessments
"""
from typing import Dict, List, Optional


class SecurityHeaderAnalyzer:
    """
    Analyzes HTTP security headers from scan data.
    Reports presence/absence and values - no judgments.
    """

    # Headers we care about
    SECURITY_HEADERS = {
        'strict-transport-security': {
            'name': 'Strict-Transport-Security',
            'description': 'Enforces HTTPS connections',
            'type': 'transport',
        },
        'content-security-policy': {
            'name': 'Content-Security-Policy',
            'description': 'Controls resource loading',
            'type': 'content',
        },
        'x-frame-options': {
            'name': 'X-Frame-Options',
            'description': 'Controls iframe embedding',
            'type': 'clickjacking',
        },
        'x-content-type-options': {
            'name': 'X-Content-Type-Options',
            'description': 'Prevents MIME type sniffing',
            'type': 'content',
        },
        'referrer-policy': {
            'name': 'Referrer-Policy',
            'description': 'Controls referrer information',
            'type': 'privacy',
        },
        'permissions-policy': {
            'name': 'Permissions-Policy',
            'description': 'Controls browser features',
            'type': 'permissions',
        },
        'x-xss-protection': {
            'name': 'X-XSS-Protection',
            'description': 'Legacy XSS filter (deprecated)',
            'type': 'legacy',
        },
        'cross-origin-opener-policy': {
            'name': 'Cross-Origin-Opener-Policy',
            'description': 'Isolates browsing context',
            'type': 'isolation',
        },
        'cross-origin-embedder-policy': {
            'name': 'Cross-Origin-Embedder-Policy',
            'description': 'Controls resource embedding',
            'type': 'isolation',
        },
        'cross-origin-resource-policy': {
            'name': 'Cross-Origin-Resource-Policy',
            'description': 'Controls resource access',
            'type': 'isolation',
        },
    }

    def __init__(self, scan_data: Dict):
        self.data = scan_data
        self.events = scan_data.get('events', [])
        self.main_document = self._get_main_document()

    def _get_main_document(self) -> Optional[Dict]:
        """Get the main HTML document from events"""
        for event in self.events:
            if event.get('resource_type') == 'document':
                return event
        return None

    def analyze(self) -> Dict:
        """
        Analyze security headers and characteristics.

        Returns:
            Dictionary containing header analysis and observations
        """
        if not self.main_document:
            return {
                'headers': {},
                'observations': [],
                'summary': 'No main document found',
            }

        headers = self.main_document.get('response_headers', {})

        # Normalize header keys to lowercase
        normalized_headers = {k.lower(): v for k, v in headers.items()}

        # Analyze each security header
        header_analysis = {}
        for key, info in self.SECURITY_HEADERS.items():
            header_analysis[key] = self._analyze_header(
                key,
                info,
                normalized_headers.get(key)
            )

        # Generate observations
        observations = self._generate_observations(header_analysis, normalized_headers)

        # Create summary
        present_count = sum(1 for h in header_analysis.values() if h['present'])
        total_count = len(self.SECURITY_HEADERS)

        return {
            'headers': header_analysis,
            'observations': observations,
            'summary': {
                'present': present_count,
                'absent': total_count - present_count,
                'total': total_count,
            },
            'server_info': self._get_server_info(normalized_headers),
        }

    def _analyze_header(self, key: str, info: Dict, value: Optional[str]) -> Dict:
        """Analyze a single header"""
        present = value is not None

        result = {
            'key': key,
            'name': info['name'],
            'description': info['description'],
            'type': info['type'],
            'present': present,
            'value': value if present else None,
        }

        # Add parsed details for specific headers
        if present and value:
            if key == 'strict-transport-security':
                result['details'] = self._parse_hsts(value)
            elif key == 'content-security-policy':
                result['details'] = self._parse_csp(value)
            elif key == 'permissions-policy':
                result['details'] = self._parse_permissions_policy(value)

        return result

    def _parse_hsts(self, value: str) -> Dict:
        """Parse HSTS header"""
        details = {
            'max_age': None,
            'include_subdomains': False,
            'preload': False,
        }

        parts = [p.strip() for p in value.split(';')]
        for part in parts:
            if part.startswith('max-age='):
                try:
                    details['max_age'] = int(part.split('=')[1])
                except (ValueError, IndexError):
                    pass
            elif part.lower() == 'includesubdomains':
                details['include_subdomains'] = True
            elif part.lower() == 'preload':
                details['preload'] = True

        return details

    def _parse_csp(self, value: str) -> Dict:
        """Parse CSP header (simplified)"""
        directives = {}
        parts = [p.strip() for p in value.split(';') if p.strip()]

        for part in parts:
            if ' ' in part:
                directive, sources = part.split(' ', 1)
                directives[directive] = sources
            else:
                directives[part] = ''

        return {
            'directive_count': len(directives),
            'has_default_src': 'default-src' in directives,
            'has_script_src': 'script-src' in directives,
            'directives': list(directives.keys())[:5],  # First 5
        }

    def _parse_permissions_policy(self, value: str) -> Dict:
        """Parse Permissions-Policy header (simplified)"""
        policies = [p.strip().split('=')[0] for p in value.split(',') if p.strip()]

        return {
            'policy_count': len(policies),
            'policies': policies[:5],  # First 5
        }

    def _generate_observations(self, headers: Dict, all_headers: Dict) -> List[Dict]:
        """Generate observable facts (not security claims)"""
        observations = []

        # HTTPS observation
        target_url = self.data.get('target_url', '')
        if target_url.startswith('https://'):
            observations.append({
                'type': 'transport',
                'title': 'HTTPS Connection',
                'description': 'Site accessed via HTTPS',
                'indicator': 'info',
            })

        # HSTS observation
        if headers.get('strict-transport-security', {}).get('present'):
            hsts = headers['strict-transport-security']
            max_age = hsts.get('details', {}).get('max_age', 0)

            if max_age > 0:
                observations.append({
                    'type': 'transport',
                    'title': 'HSTS Enabled',
                    'description': f'Max age: {max_age} seconds (~{max_age // 86400} days)',
                    'indicator': 'positive',
                })

        # CSP observation
        if headers.get('content-security-policy', {}).get('present'):
            csp = headers['content-security-policy']
            details = csp.get('details', {})

            observations.append({
                'type': 'content',
                'title': 'Content Security Policy Present',
                'description': f'{details.get("directive_count", 0)} directives configured',
                'indicator': 'info',
            })

        # Frame options
        if headers.get('x-frame-options', {}).get('present'):
            value = headers['x-frame-options']['value']
            observations.append({
                'type': 'clickjacking',
                'title': 'Frame Options Set',
                'description': f'Value: {value}',
                'indicator': 'info',
            })

        # Missing headers (factual observation, not a vulnerability claim)
        absent_headers = [
            h['name'] for h in headers.values()
            if not h['present'] and h['type'] != 'legacy'
        ]

        if absent_headers:
            observations.append({
                'type': 'general',
                'title': 'Headers Not Present',
                'description': f'{len(absent_headers)} security headers not observed',
                'indicator': 'neutral',
                'details': absent_headers[:3],  # First 3
            })

        # Server header observation
        server = all_headers.get('server')
        if server:
            observations.append({
                'type': 'server',
                'title': 'Server Information Disclosed',
                'description': f'Server: {server}',
                'indicator': 'info',
            })

        # Cookie observations
        cookies = self._analyze_cookies(all_headers)
        if cookies:
            observations.extend(cookies)

        return observations

    def _analyze_cookies(self, headers: Dict) -> List[Dict]:
        """Analyze cookie settings"""
        observations = []

        set_cookie = headers.get('set-cookie', '')
        if set_cookie:
            has_secure = 'Secure' in set_cookie or 'secure' in set_cookie
            has_httponly = 'HttpOnly' in set_cookie or 'httponly' in set_cookie
            has_samesite = 'SameSite' in set_cookie or 'samesite' in set_cookie

            flags = []
            if has_secure:
                flags.append('Secure')
            if has_httponly:
                flags.append('HttpOnly')
            if has_samesite:
                flags.append('SameSite')

            if flags:
                observations.append({
                    'type': 'cookies',
                    'title': 'Cookie Flags Observed',
                    'description': f'Flags: {", ".join(flags)}',
                    'indicator': 'info',
                })

        return observations

    def _get_server_info(self, headers: Dict) -> Dict:
        """Extract server information"""
        return {
            'server': headers.get('server'),
            'powered_by': headers.get('x-powered-by'),
            'via': headers.get('via'),
        }