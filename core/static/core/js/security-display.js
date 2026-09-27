/**
 * Security Header Display
 * Shows HTTP security headers and observations
 */

window.displaySecurityAnalysis = function(security) {
    const container = document.getElementById('security-container');
    if (!container) return;

    if (!security || !security.headers) {
        container.innerHTML = `
            <div class="bg-dark-surface border border-dark-border rounded p-8 text-center text-gray-500">
                No security analysis available
            </div>
        `;
        return;
    }

    const headers = security.headers || {};
    const observations = security.observations || [];
    const summary = security.summary || {};
    const serverInfo = security.server_info || {};

    let html = `
        <div class="space-y-6">
            <!-- Summary -->
            <div class="grid grid-cols-3 gap-4">
                <div class="bg-dark-surface border border-dark-border rounded p-4">
                    <div class="text-2xl font-bold text-green-400">${summary.present || 0}</div>
                    <div class="text-xs text-gray-500">Headers Present</div>
                </div>
                <div class="bg-dark-surface border border-dark-border rounded p-4">
                    <div class="text-2xl font-bold text-gray-400">${summary.absent || 0}</div>
                    <div class="text-xs text-gray-500">Not Present</div>
                </div>
                <div class="bg-dark-surface border border-dark-border rounded p-4">
                    <div class="text-2xl font-bold text-gray-100">${summary.total || 0}</div>
                    <div class="text-xs text-gray-500">Total Checked</div>
                </div>
            </div>

            <!-- Observations -->
            ${observations.length > 0 ? `
                <div class="bg-dark-surface border border-dark-border rounded p-4">
                    <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Observations</h3>
                    <div class="space-y-2">
                        ${observations.map(obs => `
                            <div class="flex items-start space-x-3 p-3 border border-dark-border rounded hover:border-gray-600 transition-colors">
                                ${getObservationIcon(obs.indicator)}
                                <div class="flex-1 min-w-0">
                                    <div class="text-sm font-semibold text-gray-200">${escapeHtml(obs.title)}</div>
                                    <div class="text-xs text-gray-500 mt-0.5">${escapeHtml(obs.description)}</div>
                                    ${obs.details ? `
                                        <div class="text-xs text-gray-600 mt-1">
                                            ${obs.details.map(d => `<span class="mr-2">• ${escapeHtml(d)}</span>`).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Headers Detail -->
            <div class="bg-dark-surface border border-dark-border rounded">
                <div class="p-4 border-b border-dark-border">
                    <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Security Headers</h3>
                </div>
                <div class="divide-y divide-dark-border">
                    ${Object.values(headers).map(header => `
                        <div class="p-4 hover:bg-dark-hover transition-colors">
                            <div class="flex items-start justify-between mb-2">
                                <div class="flex-1">
                                    <div class="flex items-center space-x-2">
                                        <span class="text-sm font-semibold text-gray-200">${escapeHtml(header.name)}</span>
                                        ${header.present
                                            ? '<span class="px-2 py-0.5 rounded text-xs bg-green-900/30 text-green-400 border border-green-800">Present</span>'
                                            : '<span class="px-2 py-0.5 rounded text-xs bg-gray-800/30 text-gray-500 border border-gray-700">Absent</span>'
                                        }
                                    </div>
                                    <div class="text-xs text-gray-500 mt-1">${escapeHtml(header.description)}</div>
                                </div>
                            </div>
                            ${header.present && header.value ? `
                                <div class="mt-2 p-2 bg-dark-bg rounded">
                                    <div class="text-xs text-gray-400 font-mono break-all">${escapeHtml(header.value)}</div>
                                </div>
                            ` : ''}
                            ${header.details ? `
                                <div class="mt-2 text-xs text-gray-500">
                                    ${renderHeaderDetails(header.details)}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Server Info -->
            ${serverInfo.server || serverInfo.powered_by ? `
                <div class="bg-dark-surface border border-dark-border rounded p-4">
                    <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Server Information</h3>
                    <div class="space-y-2 text-sm">
                        ${serverInfo.server ? `
                            <div class="flex items-center space-x-2">
                                <span class="text-gray-500">Server:</span>
                                <code class="text-gray-300">${escapeHtml(serverInfo.server)}</code>
                            </div>
                        ` : ''}
                        ${serverInfo.powered_by ? `
                            <div class="flex items-center space-x-2">
                                <span class="text-gray-500">Powered By:</span>
                                <code class="text-gray-300">${escapeHtml(serverInfo.powered_by)}</code>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}

            <!-- Disclaimer -->
            <div class="bg-yellow-900/10 border border-yellow-800/30 rounded p-4">
                <div class="flex items-start space-x-2">
                    <svg class="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    <div class="text-xs text-yellow-200/80">
                        <div class="font-semibold mb-1">Note</div>
                        <div>This section reports observable facts about HTTP headers. It does not make security claims or identify vulnerabilities. The presence or absence of headers is informational only.</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
};

function getObservationIcon(indicator) {
    const icons = {
        'positive': '<svg class="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>',
        'info': '<svg class="w-5 h-5 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>',
        'neutral': '<svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 000 2h4a1 1 0 100-2H8z" clip-rule="evenodd"></path></svg>',
    };
    return icons[indicator] || icons['info'];
}

function renderHeaderDetails(details) {
    if (!details || typeof details !== 'object') return '';

    return Object.entries(details).map(([key, value]) => {
        if (Array.isArray(value)) {
            return `<div><span class="text-gray-400">${key}:</span> ${value.join(', ')}</div>`;
        }
        return `<div><span class="text-gray-400">${key}:</span> ${value}</div>`;
    }).join('');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}