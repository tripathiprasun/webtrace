// Results table population with sorting and filtering

window.currentScanData = null;
window.currentSort = { column: null, ascending: true };
window.currentFilter = 'all';

window.populateDomainsTable = function(domainsData, events) {
    const tbody = document.querySelector('#domains-table tbody');

    if (!events || events.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="py-4 px-4 text-center text-gray-500">No domains found</td></tr>';
        return;
    }

    // Aggregate stats from events
    const domainStats = {};

    events.forEach(event => {
        const hostname = event.hostname;
        if (!hostname) return;

        if (!domainStats[hostname]) {
            domainStats[hostname] = {
                requests: 0,
                size: 0,
                isFirstParty: false
            };
        }

        domainStats[hostname].requests++;
        domainStats[hostname].size += event.size || 0;
    });

    // Determine first-party domains
    const targetHostname = new URL(window.currentScanData.target_url).hostname;
    Object.keys(domainStats).forEach(hostname => {
        domainStats[hostname].isFirstParty =
            hostname === targetHostname ||
            hostname.endsWith(`.${targetHostname}`);
    });

    // Sort by request count
    const sortedDomains = Object.entries(domainStats)
        .sort((a, b) => b[1].requests - a[1].requests);

    if (sortedDomains.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="py-4 px-4 text-center text-gray-500">No domains found</td></tr>';
        return;
    }

    tbody.innerHTML = sortedDomains.map(([domain, stats]) => `
        <tr class="hover:bg-dark-hover transition-colors">
            <td class="py-3 px-4">
                <code class="text-gray-300">${escapeHtml(domain)}</code>
            </td>
            <td class="py-3 px-4">
                ${stats.isFirstParty
                    ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-900/30 text-blue-400 border border-blue-800">1st party</span>'
                    : '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-900/30 text-orange-400 border border-orange-800">3rd party</span>'
                }
            </td>
            <td class="py-3 px-4 text-right font-mono text-gray-300">${stats.requests}</td>
            <td class="py-3 px-4 text-right font-mono text-gray-300">${formatBytes(stats.size)}</td>
        </tr>
    `).join('');
};

window.populateResourcesTable = function(resources) {
    if (!resources || resources.length === 0) {
        document.querySelector('#resources-table tbody').innerHTML =
            '<tr><td colspan="6" class="py-4 px-4 text-center text-gray-500">No resources found</td></tr>';
        document.querySelectorAll('.filter-count').forEach(el => el.textContent = '0');
        return;
    }

    // Apply filter
    let filteredResources = resources;
    if (window.currentFilter !== 'all') {
        filteredResources = resources.filter(r => (r.resource_type || 'other') === window.currentFilter);
    }

    // Apply sort
    if (window.currentSort.column) {
        filteredResources = sortResources(filteredResources, window.currentSort.column, window.currentSort.ascending);
    }

    renderResourcesTable(filteredResources);
    updateFilterCounts(resources);
};

function renderResourcesTable(resources) {
    const tbody = document.querySelector('#resources-table tbody');

    if (resources.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-4 px-4 text-center text-gray-500">No resources match filter</td></tr>';
        return;
    }

    tbody.innerHTML = resources.map((resource, index) => {
        // Find original index in full array for viewResource
        const originalIndex = window.currentScanData.events.findIndex(e =>
            e.url === resource.url && e.start_time === resource.start_time
        );

        return `
            <tr class="hover:bg-dark-hover transition-colors">
                <td class="py-3 px-4">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs ${getResourceTypeColor(resource.resource_type)}">
                        ${resource.resource_type || 'other'}
                    </span>
                </td>
                <td class="py-3 px-4">
                    <div class="flex items-center space-x-2">
                        <code class="text-gray-400 text-xs">${resource.method}</code>
                        <code class="text-gray-300 truncate max-w-xl" title="${escapeHtml(resource.url)}">${escapeHtml(resource.url)}</code>
                    </div>
                </td>
                <td class="py-3 px-4 text-center">
                    ${resource.failed
                        ? '<span class="text-red-400">FAILED</span>'
                        : `<span class="${getStatusColor(resource.status)}">${resource.status || '-'}</span>`
                    }
                </td>
                <td class="py-3 px-4 text-right font-mono text-gray-300">${formatBytes(resource.size)}</td>
                <td class="py-3 px-4 text-right font-mono text-gray-300">${resource.duration || 0}ms</td>
                <td class="py-3 px-4">
                    <div class="flex items-center justify-end space-x-1">
                        <button
                            onclick="viewResource(${originalIndex})"
                            class="p-1 hover:bg-dark-bg rounded transition-colors"
                            title="View details"
                        >
                            <svg class="w-4 h-4 text-gray-500 hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                        </button>
                        <button
                            onclick="openResourceInNewTab('${escapeHtml(resource.url)}')"
                            class="p-1 hover:bg-dark-bg rounded transition-colors"
                            title="Open in new tab"
                        >
                            <svg class="w-4 h-4 text-gray-500 hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                            </svg>
                        </button>
                        <button
                            onclick="copyResourceUrl('${escapeHtml(resource.url)}')"
                            class="p-1 hover:bg-dark-bg rounded transition-colors"
                            title="Copy URL"
                        >
                            <svg class="w-4 h-4 text-gray-500 hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function sortResources(resources, column, ascending) {
    const sorted = [...resources].sort((a, b) => {
        let valA, valB;

        switch(column) {
            case 'type':
                valA = a.resource_type || 'other';
                valB = b.resource_type || 'other';
                break;
            case 'status':
                valA = a.status || 0;
                valB = b.status || 0;
                break;
            case 'size':
                valA = a.size || 0;
                valB = b.size || 0;
                break;
            case 'duration':
                valA = a.duration || 0;
                valB = b.duration || 0;
                break;
            default:
                return 0;
        }

        if (valA < valB) return ascending ? -1 : 1;
        if (valA > valB) return ascending ? 1 : -1;
        return 0;
    });

    return sorted;
}

window.sortBy = function(column) {
    if (window.currentSort.column === column) {
        window.currentSort.ascending = !window.currentSort.ascending;
    } else {
        window.currentSort.column = column;
        window.currentSort.ascending = true;
    }

    if (window.currentScanData && window.currentScanData.events) {
        populateResourcesTable(window.currentScanData.events);
    }
};

window.filterByType = function(type) {
    window.currentFilter = type;

    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-green-600', 'text-white', 'border-green-600');
        btn.classList.add('bg-dark-surface', 'text-gray-400', 'border-dark-border');
    });

    const activeBtn = document.querySelector(`[data-filter="${type}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-dark-surface', 'text-gray-400', 'border-dark-border');
        activeBtn.classList.add('bg-green-600', 'text-white', 'border-green-600');
    }

    if (window.currentScanData && window.currentScanData.events) {
        populateResourcesTable(window.currentScanData.events);
    }
};

function updateFilterCounts(resources) {
    const counts = {
        'all': resources.length,
        'document': 0,
        'script': 0,
        'stylesheet': 0,
        'image': 0,
        'font': 0,
        'xhr': 0,
        'fetch': 0,
        'media': 0,
        'other': 0
    };

    resources.forEach(r => {
        const type = r.resource_type || 'other';
        if (counts.hasOwnProperty(type)) {
            counts[type]++;
        } else {
            counts['other']++;
        }
    });

    // Combine xhr and fetch
    counts['xhr'] += counts['fetch'];

    // Update count badges
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const filter = btn.dataset.filter;
        const countEl = btn.querySelector('.filter-count');
        if (countEl && counts.hasOwnProperty(filter)) {
            countEl.textContent = counts[filter];
        }
    });
}

// Resource modal and actions
window.viewResource = function(index) {
    if (!window.currentScanData || !window.currentScanData.events) return;

    const resource = window.currentScanData.events[index];
    if (!resource) return;

    const modal = document.getElementById('resource-modal');
    const content = document.getElementById('resource-modal-content');

    content.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-start justify-between">
                <h3 class="text-lg font-semibold text-gray-100">Resource Details</h3>
                <button onclick="closeResourceModal()" class="text-gray-500 hover:text-gray-300">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <div class="space-y-3">
                <div>
                    <div class="text-xs text-gray-500 mb-1">URL</div>
                    <div class="bg-dark-bg border border-dark-border rounded p-2 text-xs font-mono text-gray-300 break-all">
                        ${escapeHtml(resource.url)}
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <div class="text-xs text-gray-500 mb-1">Method</div>
                        <div class="text-sm text-gray-300">${resource.method}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-500 mb-1">Status</div>
                        <div class="text-sm ${getStatusColor(resource.status)}">${resource.status || 'N/A'}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-500 mb-1">Type</div>
                        <div class="text-sm text-gray-300">${resource.resource_type || 'other'}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-500 mb-1">Size</div>
                        <div class="text-sm text-gray-300">${formatBytes(resource.size)}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-500 mb-1">Duration</div>
                        <div class="text-sm text-gray-300">${resource.duration || 0}ms</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-500 mb-1">Hostname</div>
                        <div class="text-sm text-gray-300">${resource.hostname || 'N/A'}</div>
                    </div>
                </div>

                ${resource.content_type ? `
                    <div>
                        <div class="text-xs text-gray-500 mb-1">Content Type</div>
                        <div class="text-sm text-gray-300">${escapeHtml(resource.content_type)}</div>
                    </div>
                ` : ''}

                ${resource.redirect_url ? `
                    <div>
                        <div class="text-xs text-gray-500 mb-1">Redirect To</div>
                        <div class="bg-dark-bg border border-dark-border rounded p-2 text-xs font-mono text-gray-300 break-all">
                            ${escapeHtml(resource.redirect_url)}
                        </div>
                    </div>
                ` : ''}

                ${resource.failed ? `
                    <div class="bg-red-900/20 border border-red-800 rounded p-3">
                        <div class="text-xs text-red-400 font-semibold mb-1">Request Failed</div>
                        <div class="text-xs text-gray-400">${escapeHtml(resource.failure_text || 'Unknown error')}</div>
                    </div>
                ` : ''}
            </div>

            <div class="flex space-x-2 pt-2">
                <button
                    onclick="openResourceInNewTab('${escapeHtml(resource.url)}')"
                    class="flex-1 px-3 py-2 bg-dark-surface border border-dark-border hover:border-gray-600 rounded text-sm text-gray-300 transition-colors"
                >
                    <span class="flex items-center justify-center space-x-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                        <span>Open Resource</span>
                    </span>
                </button>
                <button
                    onclick="copyResourceUrl('${escapeHtml(resource.url)}')"
                    class="px-3 py-2 bg-dark-surface border border-dark-border hover:border-gray-600 rounded text-sm text-gray-300 transition-colors"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
};

window.closeResourceModal = function() {
    document.getElementById('resource-modal').classList.add('hidden');
};

window.openResourceInNewTab = function(url) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = url;
    const decodedUrl = textarea.value;
    window.open(decodedUrl, '_blank', 'noopener,noreferrer');
};

window.copyResourceUrl = function(url) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = url;
    const decodedUrl = textarea.value;

    navigator.clipboard.writeText(decodedUrl).then(() => {
        showToast('URL copied to clipboard');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showToast('Failed to copy URL', true);
    });
};

window.showToast = function(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded text-sm ${isError ? 'bg-red-600' : 'bg-green-600'} text-white shadow-lg transition-opacity duration-300 z-50`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
};

// UPDATED: Complete JSON report with DNA, technologies, and security
window.downloadReport = function() {
    if (!window.currentScanData) {
        showToast('No scan data available', true);
        return;
    }

    const report = {
        generated_at: new Date().toISOString(),
        webtrace_version: '1.0',

        // Basic scan info
        target_url: window.currentScanData.target_url,
        final_url: window.currentScanData.final_url,

        // Summary statistics
        summary: {
            total_requests: window.currentScanData.total_requests,
            unique_domains: window.currentScanData.unique_domains,
            first_party_domains: window.currentScanData.first_party_domains,
            third_party_domains: window.currentScanData.third_party_domains,
            total_size_bytes: window.currentScanData.total_size_bytes,
            scan_duration_ms: window.currentScanData.scan_duration_ms,
        },

        // Website DNA (Phase 8)
        dna: window.currentScanData.dna || null,

        // Detected technologies (Phase 9)
        technologies: window.currentScanData.technologies || [],

        // Security analysis (Phase 10)
        security: window.currentScanData.security || null,

        // Domain information
        domains: window.currentScanData.domains,

        // All resources/events
        resources: window.currentScanData.events,

        // Resource type breakdown
        resource_types: window.currentScanData.resource_types || {},
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // Use target domain in filename
    const targetDomain = new URL(window.currentScanData.target_url).hostname;
    a.download = `webtrace-${targetDomain}-${new Date().getTime()}.json`;

    a.click();
    URL.revokeObjectURL(url);

    showToast('Complete report downloaded');
};

// UPDATED: Enhanced CSV export with more metadata
window.downloadResourceList = function() {
    if (!window.currentScanData || !window.currentScanData.events) {
        showToast('No scan data available', true);
        return;
    }

    // Build CSV with comprehensive data
    const headers = [
        'Type',
        'URL',
        'Hostname',
        'Method',
        'Status',
        'Status Text',
        'Size (bytes)',
        'Duration (ms)',
        'Content Type',
        'Failed',
        'Redirect',
        'First Party'
    ];

    const targetHostname = new URL(window.currentScanData.target_url).hostname;

    const rows = window.currentScanData.events.map(r => {
        const isFirstParty = r.hostname === targetHostname || r.hostname.endsWith(`.${targetHostname}`);

        return [
            r.resource_type || 'other',
            r.url,
            r.hostname || '',
            r.method,
            r.status || '',
            r.status_text || '',
            r.size || 0,
            r.duration || 0,
            r.content_type || '',
            r.failed ? 'Yes' : 'No',
            r.is_redirect ? 'Yes' : 'No',
            isFirstParty ? 'Yes' : 'No'
        ];
    });

    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const targetDomain = new URL(window.currentScanData.target_url).hostname;
    a.download = `webtrace-resources-${targetDomain}-${new Date().getTime()}.csv`;

    a.click();
    URL.revokeObjectURL(url);

    showToast('CSV resource list downloaded');
};

// NEW: Summary text report
window.downloadSummaryReport = function() {
    if (!window.currentScanData) {
        showToast('No scan data available', true);
        return;
    }

    const data = window.currentScanData;
    const dna = data.dna || {};
    const tech = data.technologies || [];
    const security = data.security || {};

    // Generate human-readable text report
    let report = `WEBTRACE SCAN REPORT
${'='.repeat(80)}

Target URL: ${data.target_url}
Final URL: ${data.final_url}
Scan Date: ${new Date().toISOString()}

SUMMARY
${'-'.repeat(80)}
Total Requests: ${data.total_requests}
Unique Domains: ${data.unique_domains} (${data.first_party_domains} first-party, ${data.third_party_domains} third-party)
Total Size: ${formatBytes(data.total_size_bytes)}
Duration: ${data.scan_duration_ms}ms

`;

    // DNA Section
    if (dna.complexity) {
        report += `WEBSITE DNA
${'-'.repeat(80)}
Complexity Score: ${dna.complexity.score}/100 (${dna.complexity.level})
${dna.complexity.description}

Domain Strategy: ${dna.domain_profile?.strategy || 'N/A'}
Performance Rating: ${dna.performance_profile?.speed_rating || 'N/A'}
Average Request Duration: ${dna.performance_profile?.avg_duration || 0}ms

`;
    }

    // Technologies
    if (tech.length > 0) {
        report += `DETECTED TECHNOLOGIES (${tech.length})
${'-'.repeat(80)}
`;
        const byCategory = {};
        tech.forEach(t => {
            const cat = t.category || 'Other';
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(t.name);
        });

        Object.entries(byCategory).forEach(([category, names]) => {
            report += `${category}:\n`;
            names.forEach(name => report += `  - ${name}\n`);
        });
        report += '\n';
    }

    // Security Headers
    if (security.summary) {
        report += `SECURITY HEADERS
${'-'.repeat(80)}
Present: ${security.summary.present}/${security.summary.total}
Absent: ${security.summary.absent}

`;
        if (security.headers) {
            Object.values(security.headers).forEach(h => {
                report += `${h.name}: ${h.present ? 'PRESENT' : 'ABSENT'}\n`;
                if (h.present && h.value) {
                    report += `  Value: ${h.value}\n`;
                }
            });
        }
        report += '\n';
    }

    // Top domains
    if (dna.most_contacted_domains && dna.most_contacted_domains.length > 0) {
        report += `TOP DOMAINS
${'-'.repeat(80)}
`;
        dna.most_contacted_domains.slice(0, 10).forEach(d => {
            report += `${d.hostname} (${d.is_first_party ? '1st party' : '3rd party'}): ${d.requests} requests\n`;
        });
        report += '\n';
    }

    // Largest resources
    if (dna.largest_resources && dna.largest_resources.length > 0) {
        report += `LARGEST RESOURCES
${'-'.repeat(80)}
`;
        dna.largest_resources.slice(0, 10).forEach(r => {
            report += `${formatBytes(r.size)} - ${r.type} - ${r.url}\n`;
        });
    }

    report += `\n${'='.repeat(80)}
Generated by WebTrace
Built by Prasun Tripathi
`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const targetDomain = new URL(data.target_url).hostname;
    a.download = `webtrace-summary-${targetDomain}-${new Date().getTime()}.txt`;

    a.click();
    URL.revokeObjectURL(url);

    showToast('Summary report downloaded');
};

function getResourceTypeColor(type) {
    const colors = {
        'document': 'bg-purple-900/30 text-purple-400 border border-purple-800',
        'script': 'bg-yellow-900/30 text-yellow-400 border border-yellow-800',
        'stylesheet': 'bg-blue-900/30 text-blue-400 border border-blue-800',
        'image': 'bg-green-900/30 text-green-400 border border-green-800',
        'font': 'bg-pink-900/30 text-pink-400 border border-pink-800',
        'xhr': 'bg-cyan-900/30 text-cyan-400 border border-cyan-800',
        'fetch': 'bg-cyan-900/30 text-cyan-400 border border-cyan-800',
        'media': 'bg-red-900/30 text-red-400 border border-red-800',
        'other': 'bg-gray-800/30 text-gray-400 border border-gray-700',
    };
    return colors[type] || colors['other'];
}

function getStatusColor(status) {
    if (!status) return 'text-gray-500';
    if (status >= 200 && status < 300) return 'text-green-400';
    if (status >= 300 && status < 400) return 'text-blue-400';
    if (status >= 400 && status < 500) return 'text-orange-400';
    if (status >= 500) return 'text-red-400';
    return 'text-gray-400';
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeResourceModal();
    }
});

document.addEventListener('click', (e) => {
    if (e.target.id === 'resource-modal') {
        closeResourceModal();
    }
});