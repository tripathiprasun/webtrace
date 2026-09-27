from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
import json

from .validators import URLValidationError, URLValidator
from .executor import ScanExecutor


def index(request):
    """Main WebTrace interface"""
    return render(request, 'core/index.html')


def health_check(request):
    """Basic health check endpoint"""
    return JsonResponse({
        'status': 'ok',
        'service': 'webtrace'
    })


@require_http_methods(["POST"])
def scan_url(request):
    """
    Scan a URL and return results immediately (stateless).

    POST /api/scan/
    Body: {"url": "https://example.com"}

    Returns:
        200: Complete scan results
        400: {"error": "error message"}
    """
    try:
        data = json.loads(request.body)
        url = data.get('url', '').strip()

        if not url:
            return JsonResponse({
                'error': 'URL is required'
            }, status=400)

        # Validate URL
        try:
            normalized_url = URLValidator.validate(url)
        except URLValidationError as e:
            return JsonResponse({
                'error': str(e)
            }, status=400)

        # Execute scan immediately (blocking)
        from .scanner import PlaywrightScanner

        scanner = PlaywrightScanner()
        results = scanner.scan(normalized_url)

        return JsonResponse(results)

    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid JSON'
        }, status=400)

    except Exception as e:
        return JsonResponse({
            'error': f'Scan failed: {str(e)}'
        }, status=500)