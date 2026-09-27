"""
Website DNA Analyzer
Generates a behavioral fingerprint of a website based on observed data
"""
from typing import Dict, List
from collections import Counter


class WebsiteDNA:
    """
    Analyzes scan data to create a behavioral fingerprint.
    Reports observable facts without making security claims.
    """

    def __init__(self, scan_data: Dict):
        self.data = scan_data
        self.events = scan_data.get('events', [])
        self.domains = scan_data.get('domains', {})

    def analyze(self) -> Dict:
        """
        Generate complete DNA profile.

        Returns:
            Dictionary containing all analysis results
        """
        return {
            'complexity': self.analyze_complexity(),
            'resource_profile': self.analyze_resource_profile(),
            'domain_profile': self.analyze_domain_profile(),
            'performance_profile': self.analyze_performance(),
            'largest_resources': self.get_largest_resources(10),
            'most_contacted_domains': self.get_top_domains(10),
            'third_party_analysis': self.analyze_third_party(),
            'redirect_chain': self.analyze_redirects(),
            'failed_requests': self.analyze_failures(),
        }

    def analyze_complexity(self) -> Dict:
        """Analyze website complexity metrics"""
        total_requests = len(self.events)
        unique_domains = len(self.domains.get('all', []))

        # Calculate complexity score (0-100)
        # Based on requests and domains
        complexity_score = min(100, (total_requests / 2) + (unique_domains * 5))

        # Classify complexity
        if complexity_score < 20:
            complexity_level = 'minimal'
            description = 'Very simple site with few resources'
        elif complexity_score < 40:
            complexity_level = 'low'
            description = 'Simple site with basic resources'
        elif complexity_score < 60:
            complexity_level = 'moderate'
            description = 'Average complexity with multiple resource types'
        elif complexity_score < 80:
            complexity_level = 'high'
            description = 'Complex site with many dependencies'
        else:
            complexity_level = 'very_high'
            description = 'Highly complex site with extensive resource loading'

        return {
            'score': round(complexity_score, 1),
            'level': complexity_level,
            'description': description,
            'total_requests': total_requests,
            'unique_domains': unique_domains,
        }

    def analyze_resource_profile(self) -> Dict:
        """Analyze resource type distribution"""
        type_counts = Counter(e.get('resource_type', 'other') for e in self.events)
        total = len(self.events)

        profile = {}
        for resource_type, count in type_counts.items():
            percentage = (count / total * 100) if total > 0 else 0
            profile[resource_type] = {
                'count': count,
                'percentage': round(percentage, 1)
            }

        # Determine dominant resource type
        if type_counts:
            dominant_type = type_counts.most_common(1)[0][0]
            dominant_count = type_counts.most_common(1)[0][1]
        else:
            dominant_type = None
            dominant_count = 0

        return {
            'breakdown': profile,
            'dominant_type': dominant_type,
            'dominant_count': dominant_count,
        }

    def analyze_domain_profile(self) -> Dict:
        """Analyze domain usage patterns"""
        all_domains = self.domains.get('all', [])
        first_party = set(self.domains.get('first_party', []))
        third_party = set(self.domains.get('third_party', []))

        total_domains = len(all_domains)
        first_party_count = len(first_party)
        third_party_count = len(third_party)

        # Calculate third-party ratio
        if total_domains > 0:
            third_party_ratio = (third_party_count / total_domains) * 100
        else:
            third_party_ratio = 0

        # Classify domain strategy
        if third_party_count == 0:
            strategy = 'self_hosted'
            description = 'All resources served from same domain'
        elif third_party_ratio < 30:
            strategy = 'mostly_first_party'
            description = 'Primarily self-hosted with minimal external dependencies'
        elif third_party_ratio < 60:
            strategy = 'balanced'
            description = 'Mix of first-party and third-party resources'
        else:
            strategy = 'third_party_heavy'
            description = 'Heavily reliant on external domains'

        return {
            'total_domains': total_domains,
            'first_party_count': first_party_count,
            'third_party_count': third_party_count,
            'third_party_ratio': round(third_party_ratio, 1),
            'strategy': strategy,
            'description': description,
        }

    def analyze_performance(self) -> Dict:
        """Analyze performance characteristics"""
        if not self.events:
            return {
                'avg_duration': 0,
                'total_size': 0,
                'total_duration': 0,
            }

        durations = [e.get('duration', 0) for e in self.events]
        sizes = [e.get('size', 0) for e in self.events]

        avg_duration = sum(durations) / len(durations) if durations else 0
        total_size = sum(sizes)
        total_duration = self.data.get('scan_duration_ms', 0)

        # Calculate performance rating
        if avg_duration < 100:
            speed_rating = 'fast'
        elif avg_duration < 300:
            speed_rating = 'moderate'
        else:
            speed_rating = 'slow'

        return {
            'avg_duration': round(avg_duration, 1),
            'total_size': total_size,
            'total_duration': total_duration,
            'speed_rating': speed_rating,
        }

    def get_largest_resources(self, limit: int = 10) -> List[Dict]:
        """Get largest resources by size"""
        sorted_events = sorted(
            self.events,
            key=lambda e: e.get('size', 0),
            reverse=True
        )

        return [
            {
                'url': e.get('url', ''),
                'type': e.get('resource_type', 'other'),
                'size': e.get('size', 0),
                'hostname': e.get('hostname', ''),
            }
            for e in sorted_events[:limit]
            if e.get('size', 0) > 0
        ]

    def get_top_domains(self, limit: int = 10) -> List[Dict]:
        """Get most contacted domains"""
        domain_requests = Counter(e.get('hostname', '') for e in self.events if e.get('hostname'))

        first_party = set(self.domains.get('first_party', []))

        return [
            {
                'hostname': domain,
                'requests': count,
                'is_first_party': domain in first_party,
            }
            for domain, count in domain_requests.most_common(limit)
        ]

    def analyze_third_party(self) -> Dict:
        """Analyze third-party resource usage"""
        third_party_domains = set(self.domains.get('third_party', []))

        if not third_party_domains:
            return {
                'count': 0,
                'domains': [],
                'analysis': 'No third-party resources detected',
            }

        # Categorize third-party domains by common patterns
        analytics = []
        cdn = []
        ads = []
        social = []
        other = []

        for domain in third_party_domains:
            domain_lower = domain.lower()

            if any(x in domain_lower for x in
                   ['analytics', 'google-analytics', 'googletagmanager', 'hotjar', 'mixpanel', 'segment']):
                analytics.append(domain)
            elif any(x in domain_lower for x in ['cdn', 'cloudflare', 'fastly', 'akamai', 'cloudfront']):
                cdn.append(domain)
            elif any(x in domain_lower for x in ['doubleclick', 'adsense', 'adservice', 'ads']):
                ads.append(domain)
            elif any(x in domain_lower for x in ['facebook', 'twitter', 'linkedin', 'instagram', 'youtube']):
                social.append(domain)
            else:
                other.append(domain)

        categories = {}
        if analytics:
            categories['analytics'] = analytics
        if cdn:
            categories['cdn'] = cdn
        if ads:
            categories['advertising'] = ads
        if social:
            categories['social_media'] = social
        if other:
            categories['other'] = other

        return {
            'count': len(third_party_domains),
            'domains': list(third_party_domains),
            'categories': categories,
        }

    def analyze_redirects(self) -> List[Dict]:
        """Analyze redirect chains"""
        redirects = [
            {
                'url': e.get('url', ''),
                'redirect_to': e.get('redirect_url', ''),
                'status': e.get('status', 0),
            }
            for e in self.events
            if e.get('is_redirect', False)
        ]

        return redirects

    def analyze_failures(self) -> Dict:
        """Analyze failed requests"""
        failed = [e for e in self.events if e.get('failed', False)]

        failure_types = Counter(e.get('failure_text', 'Unknown') for e in failed)

        return {
            'total_failures': len(failed),
            'failure_rate': round((len(failed) / len(self.events) * 100), 1) if self.events else 0,
            'failed_urls': [
                {
                    'url': e.get('url', ''),
                    'reason': e.get('failure_text', 'Unknown'),
                }
                for e in failed
            ],
            'failure_types': dict(failure_types),
        }