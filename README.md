# WebTrace

**See what a website really does.** Launch a controlled Chromium browser, capture every network request, measure load times, track third-party domains, and visualize the entire resource waterfall. No proxies, no browser extensions, everything runs server-side and results aren't stored.

## Features

- 🌐 **Real Browser Analysis** - Uses Playwright with Chromium to capture actual browser behavior
- 📊 **Network Waterfall** - Visual timeline of all resource loading
- 🔍 **Domain Classification** - Automatically identifies first-party vs third-party resources
- 📈 **Resource Breakdown** - Filter and sort by type (scripts, images, fonts, XHR, etc.)
- 📦 **Export Reports** - Download results as JSON or CSV
- 🔒 **Privacy-First** - No data storage, results shown once and never persisted
- ⚡ **Instant Analysis** - See results in real-time as they're captured

## What WebTrace Does

WebTrace observes website behavior by:
- Launching a controlled Chromium instance via Playwright
- Capturing all HTTP/HTTPS requests during page load
- Recording response status, size, timing, and content type
- Tracking redirects and failed requests
- Classifying domains as first-party or third-party
- Generating visual waterfalls and exportable reports

## Tech Stack

**Backend:**
- Python 3.10+
- Django 5.0
- Playwright (Chromium automation)
- SQLite (minimal session state only)

**Frontend:**
- Django Templates
- Vanilla JavaScript
- Tailwind CSS
- Cytoscape.js (future graph visualization)

**No React. No Vue. No unnecessary complexity.**

## Installation

### Prerequisites

- Python 3.10 or higher
- pip and venv

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/webtrace.git
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
