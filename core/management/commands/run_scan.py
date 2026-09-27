"""
Management command to run a scan from command line.
Useful for testing and debugging.
"""
from django.core.management.base import BaseCommand
from core.services import ScanService
from core.executor import ScanExecutor
from core.models import Domain


class Command(BaseCommand):
    help = 'Run a scan for a given URL'

    def add_arguments(self, parser):
        parser.add_argument('url', type=str, help='URL to scan')
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed results',
        )

    def handle(self, *args, **options):
        url = options['url']
        verbose = options.get('verbose', False)

        self.stdout.write(f"Creating scan for: {url}")

        try:
            # Create scan
            scan = ScanService.create_scan(url)
            self.stdout.write(self.style.SUCCESS(f"Scan created: ID={scan.id}"))

            # Execute scan
            self.stdout.write("Starting browser scan...")
            success = ScanExecutor.execute_scan(scan)

            if success:
                # Refresh to get updated stats
                scan.refresh_from_db()

                self.stdout.write(self.style.SUCCESS(f"\nScan completed!"))
                self.stdout.write(f"  Target URL: {scan.target_url}")
                self.stdout.write(f"  Final URL: {scan.final_url}")
                self.stdout.write(f"  Total requests: {scan.total_requests}")
                self.stdout.write(f"  Unique domains: {scan.unique_domains}")
                self.stdout.write(f"    - First party: {scan.first_party_domains}")
                self.stdout.write(f"    - Third party: {scan.third_party_domains}")
                self.stdout.write(f"  Total size: {scan.total_size_bytes:,} bytes")
                self.stdout.write(f"  Duration: {scan.duration_ms} ms")

                self.stdout.write(f"\nResource breakdown:")
                self.stdout.write(f"  Documents: {scan.document_count}")
                self.stdout.write(f"  Scripts: {scan.script_count}")
                self.stdout.write(f"  Stylesheets: {scan.stylesheet_count}")
                self.stdout.write(f"  Images: {scan.image_count}")
                self.stdout.write(f"  Fonts: {scan.font_count}")
                self.stdout.write(f"  XHR/Fetch: {scan.xhr_count + scan.fetch_count}")
                self.stdout.write(f"  Other: {scan.other_count}")

                if verbose:
                    self.stdout.write(f"\nDomains contacted:")
                    domains = Domain.objects.filter(scan=scan).order_by('-request_count')
                    for domain in domains:
                        party = "1st" if domain.is_first_party else "3rd"
                        self.stdout.write(
                            f"  [{party}] {domain.hostname}: "
                            f"{domain.request_count} requests, "
                            f"{domain.total_size_bytes:,} bytes"
                        )
            else:
                self.stdout.write(self.style.ERROR(f"Scan failed: {scan.error_message}"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {str(e)}"))