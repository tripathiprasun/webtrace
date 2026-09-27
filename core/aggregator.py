"""
Data aggregation service for scan results.
Computes statistics and aggregates domain information.
"""
from collections import defaultdict
from typing import Dict, List
from urllib.parse import urlparse

from .models import Scan, Resource, Domain


class ScanAggregator:
    """
    Aggregates scan data and computes statistics.
    """

    @staticmethod
    def aggregate_scan(scan: Scan, events: List[Dict]) -> None:
        """
        Process scan events and create Resource and Domain records.
        Updates scan summary statistics.

        Args:
            scan: Scan instance to aggregate
            events: List of event dictionaries from scanner
        """
        if not events:
            return

        # Get target hostname for first-party classification
        target_hostname = urlparse(scan.normalized_url).hostname

        # Create Resource records
        resources = []
        for event in events:
            resource = Resource(
                scan=scan,
                url=event['url'],
                hostname=event['hostname'],
                path=event['path'],
                method=event['method'],
                resource_type=event['resource_type'] or 'other',
                status=event['status'],
                status_text=event['status_text'],
                content_type=event['content_type'],
                size_bytes=event['size'],
                start_time=event['start_time'],
                duration_ms=event['duration'],
                is_redirect=event['is_redirect'],
                redirect_url=event['redirect_url'],
                failed=event['failed'],
                failure_text=event['failure_text'],
            )
            resources.append(resource)

        # Bulk create resources
        Resource.objects.bulk_create(resources)

        # Aggregate by domain
        domain_stats = defaultdict(lambda: {
            'request_count': 0,
            'total_size': 0,
            'resource_types': defaultdict(int),
        })

        for event in events:
            hostname = event['hostname']
            if not hostname:
                continue

            stats = domain_stats[hostname]
            stats['request_count'] += 1
            stats['total_size'] += event['size']

            resource_type = event['resource_type'] or 'other'
            stats['resource_types'][resource_type] += 1

        # Create Domain records
        domains = []
        for hostname, stats in domain_stats.items():
            is_first_party = (
                hostname == target_hostname or
                hostname.endswith(f'.{target_hostname}')
            )

            domain = Domain(
                scan=scan,
                hostname=hostname,
                is_first_party=is_first_party,
                request_count=stats['request_count'],
                total_size_bytes=stats['total_size'],
                document_count=stats['resource_types'].get('document', 0),
                stylesheet_count=stats['resource_types'].get('stylesheet', 0),
                script_count=stats['resource_types'].get('script', 0),
                image_count=stats['resource_types'].get('image', 0),
                font_count=stats['resource_types'].get('font', 0),
                xhr_count=stats['resource_types'].get('xhr', 0) + stats['resource_types'].get('fetch', 0),
                other_count=stats['resource_types'].get('other', 0) + stats['resource_types'].get('media', 0) + stats['resource_types'].get('websocket', 0),
            )
            domains.append(domain)

        # Bulk create domains
        Domain.objects.bulk_create(domains)

        # Update scan summary statistics
        ScanAggregator._update_scan_summary(scan, events, domain_stats, target_hostname)

    @staticmethod
    def _update_scan_summary(scan: Scan, events: List[Dict],
                            domain_stats: Dict, target_hostname: str) -> None:
        """Update scan summary statistics"""

        # Count resource types
        resource_type_counts = defaultdict(int)
        for event in events:
            resource_type = event['resource_type'] or 'other'
            resource_type_counts[resource_type] += 1

        # Count first/third party domains
        first_party_count = 0
        third_party_count = 0

        for hostname in domain_stats.keys():
            if hostname == target_hostname or hostname.endswith(f'.{target_hostname}'):
                first_party_count += 1
            else:
                third_party_count += 1

        # Update scan
        scan.unique_domains = len(domain_stats)
        scan.first_party_domains = first_party_count
        scan.third_party_domains = third_party_count

        scan.document_count = resource_type_counts.get('document', 0)
        scan.stylesheet_count = resource_type_counts.get('stylesheet', 0)
        scan.script_count = resource_type_counts.get('script', 0)
        scan.image_count = resource_type_counts.get('image', 0)
        scan.font_count = resource_type_counts.get('font', 0)
        scan.xhr_count = resource_type_counts.get('xhr', 0)
        scan.fetch_count = resource_type_counts.get('fetch', 0)
        scan.media_count = resource_type_counts.get('media', 0)
        scan.websocket_count = resource_type_counts.get('websocket', 0)
        scan.other_count = resource_type_counts.get('other', 0)

        # IMPORTANT: Save the scan with updated fields
        scan.save(update_fields=[
            'unique_domains',
            'first_party_domains',
            'third_party_domains',
            'document_count',
            'stylesheet_count',
            'script_count',
            'image_count',
            'font_count',
            'xhr_count',
            'fetch_count',
            'media_count',
            'websocket_count',
            'other_count',
        ])