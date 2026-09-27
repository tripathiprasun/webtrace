// WebTrace frontend logic

document.addEventListener('DOMContentLoaded', () => {
    const scanForm = document.getElementById('scan-form');
    const urlInput = document.getElementById('url-input');
    const urlError = document.getElementById('url-error');
    const scanButton = document.getElementById('scan-button');

    if (scanForm) {
        scanForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            hideError();

            const url = urlInput.value.trim();

            if (!url) {
                showError('URL is required');
                return;
            }

            if (!url.startsWith('https://')) {
                showError('Only HTTPS URLs are supported');
                return;
            }

            await startScan(url);
        });
    }

    async function startScan(url) {
        setButtonLoading(true);
        hideResults();

        try {
            const response = await fetch('/api/scan/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken(),
                },
                body: JSON.stringify({ url }),
            });

            const data = await response.json();

            if (!response.ok) {
                showError(data.error || 'Scan failed');
                setButtonLoading(false);
                return;
            }

            console.log('Scan data received:', data); // Debug

            // IMPORTANT: Store scan data globally
            window.currentScanData = data;

            // Display results
            displayResults(data);
            setButtonLoading(false);

        } catch (error) {
            console.error('Error:', error);
            showError('Network error. Please try again.');
            setButtonLoading(false);
        }
    }

    function displayResults(data) {
        console.log('Displaying results:', data); // Debug

        // Show results container
        document.getElementById('results-container').classList.remove('hidden');

        // Populate overview stats
        document.getElementById('stat-requests').textContent = data.total_requests || 0;
        document.getElementById('stat-domains').textContent = data.unique_domains || 0;
        document.getElementById('stat-domains-detail').textContent =
            `${data.first_party_domains || 0} 1st / ${data.third_party_domains || 0} 3rd`;
        document.getElementById('stat-size').textContent = formatBytes(data.total_size_bytes || 0);
        document.getElementById('stat-duration').textContent = `${data.scan_duration_ms || 0}ms`;

        // Check if we have events
        console.log('Events:', data.events); // Debug

        // Render waterfall
        if (data.events && data.events.length > 0) {
            new NetworkWaterfall('waterfall-container', data.events);
        } else {
            console.warn('No events to display in waterfall');
        }

        // Populate tables (pass events for aggregation)
        if (window.populateDomainsTable) {
            window.populateDomainsTable(data.domains, data.events);
        } else {
            console.error('populateDomainsTable not defined');
        }

        if (window.populateResourcesTable) {
            window.populateResourcesTable(data.events);
        } else {
            console.error('populateResourcesTable not defined');
        }

        // Scroll to results
        document.getElementById('results-container').scrollIntoView({ behavior: 'smooth' });
    }

    function hideResults() {
        document.getElementById('results-container').classList.add('hidden');
    }

    function setButtonLoading(loading) {
        scanButton.disabled = loading;

        if (loading) {
            scanButton.innerHTML = `
                <span class="flex items-center space-x-2">
                    <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Scanning...</span>
                </span>
            `;
        } else {
            scanButton.innerHTML = `
                <span class="flex items-center space-x-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <span>Start Scan</span>
                </span>
            `;
        }
    }

    function showError(message) {
        urlError.textContent = message;
        urlError.classList.remove('hidden');
    }

    function hideError() {
        urlError.classList.add('hidden');
        urlError.textContent = '';
    }

    function getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }

    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
    }
});