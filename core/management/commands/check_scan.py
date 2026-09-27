"""
Debug command to check scan data
"""
from django.core.management.base import BaseCommand
from core.models import Scan, Resource, Domain


class Command(BaseCommand):
    help = 'Check scan data for debugging'

    def add_arguments(self, parser):
        parser.add_argument('scan_id', type=int, help='Scan ID to check')

    def handle(self, *args, **options):
        scan_id = options['scan_id']

        try:
            scan = Scan.objects.get(id=scan_id)

            self.stdout.write(self.style.SUCCESS(f"\n=== SCAN {scan.id} ==="))
            self.stdout.write(f"Status: {scan.status}")
            self.stdout.write(f"Target: {scan.target_url}")
            self.stdout.write(f"Final URL: {scan.final_url}")

            self.stdout.write(f"\n=== SUMMARY ===")
            self.stdout.write(f"Total requests: {scan.total_requests}")
            self.stdout.write(f"Unique domains: {scan.unique_domains}")
            self.stdout.write(f"Total size: {scan.total_size_bytes}")

            self.stdout.write(f"\n=== RESOURCE COUNTS ===")
            self.stdout.write(f"Documents: {scan.document_count}")
            self.stdout.write(f"Scripts: {scan.script_count}")
            self.stdout.write(f"Stylesheets: {scan.stylesheet_count}")
            self.stdout.write(f"Images: {scan.image_count}")
            self.stdout.write(f"Fonts: {scan.font_count}")
            self.stdout.write(f"XHR: {scan.xhr_count}")
            self.stdout.write(f"Other: {scan.other_count}")

            # Check actual database records
            resource_count = Resource.objects.filter(scan=scan).count()
            domain_count = Domain.objects.filter(scan=scan).count()

            self.stdout.write(f"\n=== DATABASE RECORDS ===")
            self.stdout.write(f"Resources in DB: {resource_count}")
            self.stdout.write(f"Domains in DB: {domain_count}")

            if resource_count > 0:
                self.stdout.write(f"\n=== SAMPLE RESOURCES ===")
                for r in Resource.objects.filter(scan=scan)[:5]:
                    self.stdout.write(f"  {r.resource_type:10} {r.status or 'N/A':4} {r.url[:80]}")

            if domain_count > 0:
                self.stdout.write(f"\n=== DOMAINS ===")
                for d in Domain.objects.filter(scan=scan):
                    party = "1st" if d.is_first_party else "3rd"
                    self.stdout.write(f"  [{party}] {d.hostname}: {d.request_count} requests")

        except Scan.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Scan {scan_id} not found"))