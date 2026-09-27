from django.test import TestCase, Client
from django.urls import reverse
import json

from .models import Scan
from .validators import URLValidator, URLValidationError
from .services import ScanService


class URLValidatorTests(TestCase):
    """Test URL validation logic"""

    def test_valid_https_url(self):
        """Valid HTTPS URLs should pass"""
        url = URLValidator.validate('https://example.com')
        self.assertEqual(url, 'https://example.com/')

    def test_valid_https_with_path(self):
        """HTTPS URLs with paths should pass"""
        url = URLValidator.validate('https://example.com/path/to/page')
        self.assertTrue(url.startswith('https://example.com/path'))

    def test_normalizes_url(self):
        """URLs should be normalized"""
        url = URLValidator.validate('HTTPS://EXAMPLE.COM')
        self.assertEqual(url, 'https://example.com/')

    def test_rejects_http(self):
        """HTTP URLs should be rejected"""
        with self.assertRaises(URLValidationError) as cm:
            URLValidator.validate('http://example.com')
        self.assertIn('HTTPS', str(cm.exception))

    def test_rejects_file_scheme(self):
        """file:// URLs should be rejected"""
        with self.assertRaises(URLValidationError):
            URLValidator.validate('file:///etc/passwd')

    def test_rejects_javascript_scheme(self):
        """javascript: URLs should be rejected"""
        with self.assertRaises(URLValidationError):
            URLValidator.validate('javascript:alert(1)')

    def test_rejects_localhost(self):
        """localhost should be rejected"""
        with self.assertRaises(URLValidationError) as cm:
            URLValidator.validate('https://localhost')
        self.assertIn('localhost', str(cm.exception))

    def test_rejects_127_0_0_1(self):
        """127.0.0.1 should be rejected"""
        with self.assertRaises(URLValidationError):
            URLValidator.validate('https://127.0.0.1')

    def test_rejects_private_ip(self):
        """Private IP addresses should be rejected"""
        with self.assertRaises(URLValidationError):
            URLValidator.validate('https://192.168.1.1')

    def test_rejects_empty_url(self):
        """Empty URLs should be rejected"""
        with self.assertRaises(URLValidationError):
            URLValidator.validate('')

    def test_rejects_no_hostname(self):
        """URLs without hostname should be rejected"""
        with self.assertRaises(URLValidationError):
            URLValidator.validate('https://')


class ScanModelTests(TestCase):
    """Test Scan model"""

    def test_create_scan(self):
        """Can create a scan"""
        scan = Scan.objects.create(
            target_url='https://example.com',
            normalized_url='https://example.com/',
            status='QUEUED'
        )
        self.assertEqual(scan.status, 'QUEUED')
        self.assertIsNotNone(scan.created_at)

    def test_mark_started(self):
        """Can mark scan as started"""
        scan = Scan.objects.create(
            target_url='https://example.com',
            normalized_url='https://example.com/'
        )
        scan.mark_started()
        scan.refresh_from_db()

        self.assertEqual(scan.status, 'RUNNING')
        self.assertIsNotNone(scan.started_at)

    def test_mark_completed(self):
        """Can mark scan as completed"""
        scan = Scan.objects.create(
            target_url='https://example.com',
            normalized_url='https://example.com/'
        )
        scan.mark_started()
        scan.mark_completed()
        scan.refresh_from_db()

        self.assertEqual(scan.status, 'COMPLETED')
        self.assertIsNotNone(scan.completed_at)
        self.assertGreater(scan.duration_ms, 0)

    def test_mark_failed(self):
        """Can mark scan as failed"""
        scan = Scan.objects.create(
            target_url='https://example.com',
            normalized_url='https://example.com/'
        )
        scan.mark_failed('Test error')
        scan.refresh_from_db()

        self.assertEqual(scan.status, 'FAILED')
        self.assertEqual(scan.error_message, 'Test error')


class ScanAPITests(TestCase):
    """Test scan API endpoints"""

    def setUp(self):
        self.client = Client()

    def test_create_scan_valid_url(self):
        """Can create scan with valid URL"""
        response = self.client.post(
            reverse('core:create_scan'),
            data=json.dumps({'url': 'https://example.com'}),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn('scan_id', data)
        self.assertEqual(data['status'], 'QUEUED')

        # Verify scan was created
        scan = Scan.objects.get(id=data['scan_id'])
        self.assertEqual(scan.target_url, 'https://example.com')

    def test_create_scan_invalid_url(self):
        """Creating scan with invalid URL returns 400"""
        response = self.client.post(
            reverse('core:create_scan'),
            data=json.dumps({'url': 'http://example.com'}),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn('error', data)

    def test_create_scan_localhost(self):
        """Cannot create scan for localhost"""
        response = self.client.post(
            reverse('core:create_scan'),
            data=json.dumps({'url': 'https://localhost'}),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)

    def test_get_scan(self):
        """Can retrieve scan details"""
        scan = Scan.objects.create(
            target_url='https://example.com',
            normalized_url='https://example.com/'
        )

        response = self.client.get(
            reverse('core:get_scan', args=[scan.id])
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['scan_id'], scan.id)
        self.assertEqual(data['status'], 'QUEUED')

    def test_get_scan_not_found(self):
        """Getting non-existent scan returns 404"""
        response = self.client.get(
            reverse('core:get_scan', args=[99999])
        )

        self.assertEqual(response.status_code, 404)


from django.test import TestCase

# Create your tests here.
