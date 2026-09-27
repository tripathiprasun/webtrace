/**
 * Website DNA Display Component
 * Visualizes behavioral fingerprint of scanned website
 */

window.displayWebsiteDNA = function(dna) {
    const container = document.getElementById('dna-container');
    if (!container || !dna) return;

    const complexity = dna.complexity || {};
    const resourceProfile = dna.resource_profile || {};
    const domainProfile = dna.domain_profile || {};
    const performance = dna.performance_profile || {};
    const thirdParty = dna.third_party_analysis || {};
    const largest = dna.largest_resources || [];
    const topDomains = dna.most_contacted_domains || [];

    let html = `
        <div class="space-y-6">
            <!-- Complexity Score -->
            <div class="bg-dark-surface border border-dark-border rounded p-4">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Complexity Score</h3>
                <div class="flex items-end space-x-4">
                    <div class="text-4xl font-bold text-gray-100">${complexity.score || 0}</div>
                    <div class="flex-1 pb-2">
                        <div class="flex items-center space-x-2 mb-1">
                            <div class="text-sm font-semibold text-gray-300 capitalize">${complexity.level || 'unknown'}</div>
                            ${getComplexityBadge(complexity.level)}
                        </div>
                        <div class="w-full bg-dark-bg rounded-full h-2">
                            <div class="bg-green-500 h-2 rounded-full transition-all" style="width: ${complexity.score || 0}%"></div>
                        </div>
                        <div class="text-xs text-gray-500 mt-1">${complexity.description || ''}</div>
                    </div>
                </div>
            </div>

            <!-- Resource Distribution -->
            <div class="bg-dark-surface border border-dark-border rounded p-4">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Resource Distribution</h3>
                ${renderResourceDistribution(resourceProfile)}
            </div>

            <!-- Domain Strategy -->
            <div class="bg-dark-surface border border-dark-border rounded p-4">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Domain Strategy</h3>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <div class="text-2xl font-bold text-gray-100">${domainProfile.total_domains || 0}</div>
                        <div class="text-xs text-gray-500">Total Domains</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-orange-400">${domainProfile.third_party_ratio || 0}%</div>
                        <div class="text-xs text-gray-500">Third-Party Ratio</div>
                    </div>
                </div>
                <div class="mt-3 pt-3 border-t border-dark-border">
                    <div class="text-sm font-semibold text-gray-300 capitalize mb-1">${domainProfile.strategy || 'unknown'}</div>
                    <div class="text-xs text-gray-500">${domainProfile.description || ''}</div>
                </div>
            </div>

            <!-- Performance Profile -->
            <div class="bg-dark-surface border border-dark-border rounded p-4">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Performance Profile</h3>
                <div class="grid grid-cols-3 gap-4">
                    <div>
                        <div class="text-xl font-bold text-gray-100">${performance.avg_duration || 0}ms</div>
                        <div class="text-xs text-gray-500">Avg Request Time</div>
                    </div>
                    <div>
                        <div class="text-xl font-bold text-gray-100">${formatBytes(performance.total_size || 0)}</div>
                        <div class="text-xs text-gray-500">Total Size</div>
                    </div>
                    <div>
                        <div class="text-xl font-bold capitalize ${getSpeedColor(performance.speed_rating)}">${performance.speed_rating || 'unknown'}</div>
                        <div class="text-xs text-gray-500">Speed Rating</div>
                    </div>
                </div>
            </div>

            <!-- Third-Party Analysis -->
            ${thirdParty.count > 0 ? `
                <div class="bg-dark-surface border border-dark-border rounded p-4">
                    <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Third-Party Resources</h3>
                    <div class="text-2xl font-bold text-gray-100 mb-2">${thirdParty.count}</div>
                    <div class="text-xs text-gray-500 mb-3">External domains contacted</div>
                    ${renderThirdPartyCategories(thirdParty.categories || {})}
                </div>
            ` : ''}

            <!-- Largest Resources -->
            ${largest.length > 0 ? `
                <div class="bg-dark-surface border border-dark-border rounded p-4">
                    <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Largest Resources</h3>
                    <div class="space-y-2">
                        ${largest.slice(0, 5).map(r => `
                            <div class="flex items-center justify-between text-xs">
                                <div class="flex items-center space-x-2 flex-1 min-w-0">
                                    <span class="inline-flex items-center px-1.5 py-0.5 rounded ${getResourceTypeColorClass(r.type)}">${r.type}</span>
                                    <span class="text-gray-400 truncate" title="${escapeHtml(r.url)}">${getFileName(r.url)}</span>
                                </div>
                                <span class="text-gray-300 font-mono ml-2">${formatBytes(r.size)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Most Contacted Domains -->
            ${topDomains.length > 0 ? `
                <div class="bg-dark-surface border border-dark-border rounded p-4">
                    <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Most Contacted Domains</h3>
                    <div class="space-y-2">
                        ${topDomains.slice(0, 5).map(d => `
                            <div class="flex items-center justify-between text-xs">
                                <div class="flex items-center space-x-2">
                                    <span class="inline-flex items-center px-1.5 py-0.5 rounded ${d.is_first_party ? 'bg-blue-900/30 text-blue-400' : 'bg-orange-900/30 text-orange-400'}">
                                        ${d.is_first_party ? '1st' : '3rd'}
                                    </span>
                                    <span class="text-gray-300">${escapeHtml(d.hostname)}</span>
                                </div>
                                <span class="text-gray-500 font-mono">${d.requests} req</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    container.innerHTML = html;
};

function getComplexityBadge(level) {
    const badges = {
        'minimal': '<span class="px-2 py-0.5 rounded text-xs bg-green-900/30 text-green-400 border border-green-800">Minimal</span>',
        'low': '<span class="px-2 py-0.5 rounded text-xs bg-blue-900/30 text-blue-400 border border-blue-800">Low</span>',
        'moderate': '<span class="px-2 py-0.5 rounded text-xs bg-yellow-900/30 text-yellow-400 border border-yellow-800">Moderate</span>',
        'high': '<span class="px-2 py-0.5 rounded text-xs bg-orange-900/30 text-orange-400 border border-orange-800">High</span>',
        'very_high': '<span class="px-2 py-0.5 rounded text-xs bg-red-900/30 text-red-400 border border-red-800">Very High</span>',
    };
    return badges[level] || '';
}

function renderResourceDistribution(profile) {
    const breakdown = profile.breakdown || {};
    const entries = Object.entries(breakdown).sort((a, b) => b[1].count - a[1].count);

    if (entries.length === 0) return '<div class="text-xs text-gray-500">No data</div>';

    return entries.map(([type, data]) => `
        <div class="mb-2">
            <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-gray-400 capitalize">${type}</span>
                <span class="text-gray-500">${data.count} (${data.percentage}%)</span>
            </div>
            <div class="w-full bg-dark-bg rounded-full h-1.5">
                <div class="${getResourceBarColor(type)} h-1.5 rounded-full" style="width: ${data.percentage}%"></div>
            </div>
        </div>
    `).join('');
}

function renderThirdPartyCategories(categories) {
    const entries = Object.entries(categories);
    if (entries.length === 0) return '';

    return `
        <div class="space-y-2">
            ${entries.map(([category, domains]) => `
                <div class="text-xs">
                    <div class="text-gray-400 capitalize mb-1">${category.replace('_', ' ')} (${domains.length})</div>
                    <div class="flex flex-wrap gap-1">
                        ${domains.slice(0, 3).map(d => `
                            <span class="px-2 py-0.5 bg-dark-bg border border-dark-border rounded text-gray-500">${escapeHtml(d)}</span>
                        `).join('')}
                        ${domains.length > 3 ? `<span class="px-2 py-0.5 text-gray-600">+${domains.length - 3} more</span>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function getResourceBarColor(type) {
    const colors = {
        'document': 'bg-purple-500',
        'script': 'bg-yellow-500',
        'stylesheet': 'bg-blue-500',
        'image': 'bg-green-500',
        'font': 'bg-pink-500',
        'xhr': 'bg-cyan-500',
        'fetch': 'bg-cyan-500',
        'media': 'bg-red-500',
        'other': 'bg-gray-500',
    };
    return colors[type] || 'bg-gray-500';
}

function getResourceTypeColorClass(type) {
    const colors = {
        'document': 'bg-purple-900/30 text-purple-400',
        'script': 'bg-yellow-900/30 text-yellow-400',
        'stylesheet': 'bg-blue-900/30 text-blue-400',
        'image': 'bg-green-900/30 text-green-400',
        'font': 'bg-pink-900/30 text-pink-400',
        'xhr': 'bg-cyan-900/30 text-cyan-400',
        'fetch': 'bg-cyan-900/30 text-cyan-400',
        'media': 'bg-red-900/30 text-red-400',
        'other': 'bg-gray-800/30 text-gray-400',
    };
    return colors[type] || 'bg-gray-800/30 text-gray-400';
}

function getSpeedColor(rating) {
    const colors = {
        'fast': 'text-green-400',
        'moderate': 'text-yellow-400',
        'slow': 'text-red-400',
    };
    return colors[rating] || 'text-gray-400';
}

function getFileName(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const filename = pathname.split('/').pop() || urlObj.hostname;
        return filename || url;
    } catch (e) {
        return url;
    }
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