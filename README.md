# WebTrace

**See what a website really does.** Launch a controlled Chromium browser, capture every network request, measure load times, track third-party domains, and visualize the entire resource waterfall. No proxies, no browser extensions, everything runs server-side and results aren't stored.

Built by **Prasun Tripathi**

## Features

### 🌐 Real Browser Analysis
- Uses Playwright with Chromium to capture actual browser behavior
- Observes all HTTP/HTTPS requests during page load
- Records response status, size, timing, and content type
- Tracks redirects and failed requests
- 60-second navigation timeout, 120-second overall safety limit

### 📊 Network Waterfall Visualization
- Visual timeline of all resource loading
- Horizontal bars showing request timing
- Color-coded by resource type
- Hover for detailed information
- Proper scaling for long-duration scans

### 🕸️ Interactive Network Graph
- Powered by Cytoscape.js
- Shows relationships between target site, domains, and resources
- Visual distinction between first-party and third-party domains
- Click nodes to see details
- Zoom, pan, and drag interactions
- Legend and info panel

### 🧬 Website DNA Profiling
- **Complexity Score** (0-100) based on requests and domains
- **Resource Distribution** with percentage breakdown
- **Domain Strategy Analysis** (self-hosted vs third-party heavy)
- **Performance Profile** with speed ratings
- **Third-Party Analysis** categorized by type (analytics, CDN, advertising, social)
- **Largest Resources** ranking
- **Most Contacted Domains** with request counts

### 🔍 Technology Detection
- Deterministic fingerprinting based on URLs, headers, and patterns
- Detects:
  - **JavaScript Frameworks:** React, Vue, Angular, Next.js, Nuxt.js, jQuery
  - **CMS:** WordPress, Drupal, Joomla
  - **E-commerce:** Shopify
  - **Website Builders:** Wix, Squarespace
  - **CDN:** Cloudflare, Fastly, Amazon CloudFront, Akamai
  - **Analytics:** Google Analytics, Google Tag Manager, Hotjar, Mixpanel, Segment
  - **Advertising:** Google AdSense, DoubleClick
  - **CSS Frameworks:** Bootstrap, Tailwind CSS
  - **Icon Libraries:** Font Awesome
  - **Hosting:** Vercel, Netlify, GitHub Pages
  - **Web Servers:** Nginx, Apache
  - **Payment:** Stripe, PayPal
  - **Social:** Facebook Pixel, Twitter Widget
- Confidence levels (high, medium, low)
- Evidence-based detection with pattern matching

### 🔒 Security Header Inspection
- Analyzes HTTP security headers:
  - `Strict-Transport-Security` (HSTS)
  - `Content-Security-Policy` (CSP)
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Cross-Origin-Opener-Policy`
  - `Cross-Origin-Embedder-Policy`
  - `Cross-Origin-Resource-Policy`
  - Legacy headers like `X-XSS-Protection`
- Reports presence/absence and values
- Observable facts only - no security claims or vulnerability assessments
- Server information disclosure detection
- Cookie flag observations

### 📈 Resource Breakdown
- Filter by type: Documents, Scripts, CSS, Images, Fonts, XHR/Fetch
- Sort by: Type, Status, Size, Duration
- Interactive resource table with:
  - Color-coded resource type badges
  - HTTP status codes with color indicators
  - Size and duration metrics
  - Action buttons (view, open, copy URL)

### 📦 Domain Classification
- Automatically identifies first-party vs third-party resources
- Domain aggregation with request counts and total size
- First-party/third-party badge indicators
- Sorted by request volume

### 💾 Export & Reporting
- **JSON Report:** Complete scan data including DNA, technologies, and security analysis
- **CSV Export:** All resources with extended metadata (12 columns)
- **Summary Report (TXT):** Human-readable text report with key findings
- Filenames include target domain and timestamp
- Toast notifications for download confirmation

### 🎨 Developer-Focused UI
- Dark mode primary interface
- Professional network analysis tool aesthetic
- Dense but readable information layout
- Monospace typography
- Color-coded resource types and status codes
- Hover states and transitions
- Modal dialogs for detailed views
- No generic SaaS marketing fluff
- Data-first presentation

### 🔐 Privacy & Safety
- **Stateless operation** - results shown once, never persisted
- No database storage of scan results
- No user tracking
- Blocks scanning of:
  - localhost and loopback addresses
  - Private IP ranges (RFC 1918)
  - Internal networks
  - `file://`, `javascript:`, `data:` schemes
- Only HTTPS URLs supported
- Transparent user agent identification
- No authentication bypass attempts
- No CAPTCHA breaking
- No exploitation features

## Tech Stack

**Backend:**
- Python 3.10+
- Django 5.0
- Playwright (Chromium automation)
- SQLite (minimal usage)

**Frontend:**
- Django Templates
- Vanilla JavaScript (no React/Vue)
- Tailwind CSS
- Cytoscape.js (graph visualization)

**No unnecessary frameworks. No bloat.**

## Installation

### Prerequisites

- Python 3.10 or higher
- pip and venv

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/tripathiprasun/webtrace.git
cd webtrace

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Install Playwright browsers
playwright install chromium

# 6. Run migrations
python manage.py migrate

# 7. Start the development server
python manage.py runserver
```

Open your browser to `http://127.0.0.1:8000/`

## Usage

### Web Interface

1. Enter an HTTPS URL in the input field
2. Click "Start Scan"
3. Wait for the scan to complete (5-60 seconds typically)
4. View results:
   - **Overview** - Total requests, domains, size, duration
   - **Waterfall** - Visual timeline of resource loading
   - **Network Graph** - Interactive domain/resource relationships
   - **Website DNA** - Behavioral fingerprint and complexity analysis
   - **Technology Detection** - Frameworks, CMS, analytics, CDN
   - **Security Headers** - HTTP header inspection
   - **Domains** - Aggregated statistics per domain
   - **Resources** - Detailed table of all requests
5. Export data:
   - **CSV** - Spreadsheet of all resources
   - **JSON** - Complete scan report
   - **Summary (TXT)** - Human-readable findings

### Command Line Testing

```bash
# Test a scan from the command line
python manage.py run_scan https://example.com

# With verbose output (shows domain breakdown)
python manage.py run_scan https://example.com --verbose

# Check specific scan data
python manage.py check_scan <scan_id>
```

## Supported Targets

WebTrace works best with:

- Standard websites (blogs, documentation, portfolios)
- E-commerce sites
- News sites
- Most public web applications
- GitHub Pages sites
- Static site generators

**Limitations:**

- Only HTTPS URLs are supported (HTTP rejected)
- Cannot scan localhost or internal networks
- Some sites with aggressive bot detection (YouTube, Netflix, ChatGPT) may block automated browsers
- Maximum navigation timeout: 60 seconds
- Maximum overall timeout: 120 seconds
- Sites requiring authentication won't show authenticated content

## API

### Scan a URL

```
POST /api/scan/
Content-Type: application/json

{
  "url": "https://example.com"
}
```

Response (200 OK):

```json
{
  "success": true,
  "target_url": "https://example.com",
  "final_url": "https://example.com/",
  "scan_duration_ms": 5234,
  "total_requests": 42,
  "unique_domains": 8,
  "first_party_domains": 2,
  "third_party_domains": 6,
  "total_size_bytes": 1234567,
  "dna": { ... },
  "technologies": [ ... ],
  "security": { ... },
  "events": [ ... ],
  "domains": { ... }
}
```

## Configuration

### Timeouts

Edit `core/scanner.py`:

```python
NAVIGATION_TIMEOUT = 60000   # 60 seconds
OVERALL_TIMEOUT = 120000     # 120 seconds
```

### User Agent

The scanner identifies itself as:

```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 WebTrace/1.0
```

## Project Structure

```
webtrace/
├── config/                 # Django settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── core/                   # Main application
│   ├── management/
│   │   └── commands/      # CLI commands
│   ├── static/core/
│   │   ├── css/
│   │   └── js/
│   │       ├── waterfall.js
│   │       ├── network-graph.js
│   │       ├── dna-display.js
│   │       ├── tech-display.js
│   │       ├── security-display.js
│   │       └── results.js
│   ├── templates/
│   │   ├── base.html
│   │   └── core/
│   │       └── index.html
│   ├── scanner.py         # Playwright engine
│   ├── executor.py        # Scan execution
│   ├── validators.py      # URL validation
│   ├── dna_analyzer.py    # Website DNA profiling
│   ├── tech_detector.py   # Technology fingerprinting
│   ├── security_analyzer.py # Security header inspection
│   ├── models.py
│   ├── views.py
│   └── urls.py
├── db.sqlite3
├── manage.py
├── requirements.txt
└── README.md
```

## Development

### Running Tests

```bash
python manage.py test core
```

### Code Style

- Follow PEP 8 for Python
- Use type hints where helpful
- Keep functions small and focused
- Prefer clarity over cleverness
- No giant files

### Adding Technology Signatures

Edit `core/tech_detector.py`:

```python
sigs.append(
    TechnologySignature('Technology Name', 'Category')
    .add_url_pattern(r'pattern', 'high')
    .add_header_pattern('header-name', r'value-pattern')
)
```

## Troubleshooting

### Playwright Installation Issues

```bash
# Force reinstall Chromium
playwright install --force chromium

# Check installation
playwright install --help
```

### "Browser not found" Error

Make sure you ran:

```bash
playwright install chromium
```

### Timeout Errors

Some sites are slow. Increase timeouts in `core/scanner.py` if needed.

### "Database locked" in Tests

This is normal for SQLite during concurrent operations. Tests pass despite warnings.

## Roadmap

**Completed Phases (1-10):**

- [x] Phase 1: Project foundation
- [x] Phase 2: URL validation + scan model
- [x] Phase 3: Playwright engine
- [x] Phase 4: Resource data model
- [x] Phase 5: Results UI
- [x] Phase 6: Network waterfall
- [x] Phase 7: Network graph visualization
- [x] Phase 8: Website DNA profiling
- [x] Phase 9: Technology detection
- [x] Phase 10: Security header analysis

**Future Enhancements:**

- [ ] Phase 11: Scan history (optional)
- [ ] Phase 12: UI polish and refinements
- [ ] HAR file export
- [ ] Performance metrics (FCP, LCP, CLS)
- [ ] Screenshot capture
- [ ] Cookie analysis
- [ ] WebSocket traffic capture
- [ ] Comparison mode (before/after)
- [ ] Scheduled scans
- [ ] API rate limiting
- [ ] Celery for background tasks

## Contributing

This is primarily a personal/educational project. Feel free to fork and experiment.

## License

MIT License - Do whatever you want with this code.

## Acknowledgments

- Built with Django and Playwright
- Inspired by browser DevTools network panels and professional network analysis tools
- Dark mode aesthetic because light mode is for psychopaths

## Contact

Built by Prasun Tripathi

GitHub: [@tripathiprasun](https://github.com/tripathiprasun)

---

*WebTrace - Because you should know what your browser is really doing.*

Made with ☕ by Prasun Tripathi
