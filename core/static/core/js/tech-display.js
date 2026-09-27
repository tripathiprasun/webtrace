/**
 * Technology Detection Display
 * Shows detected technologies with evidence
 */

window.displayTechnologies = function(technologies) {
    const container = document.getElementById('tech-container');
    if (!container) return;

    if (!technologies || technologies.length === 0) {
        container.innerHTML = `
            <div class="bg-dark-surface border border-dark-border rounded p-8 text-center text-gray-500">
                No technologies detected
            </div>
        `;
        return;
    }

    // Group by category
    const byCategory = {};
    technologies.forEach(tech => {
        const cat = tech.category || 'Other';
        if (!byCategory[cat]) {
            byCategory[cat] = [];
        }
        byCategory[cat].push(tech);
    });

    let html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';

    Object.entries(byCategory).forEach(([category, techs]) => {
        html += `
            <div class="bg-dark-surface border border-dark-border rounded p-4">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">${category}</h3>
                <div class="space-y-2">
                    ${techs.map(tech => `
                        <div class="border border-dark-border rounded p-3 hover:border-gray-600 transition-colors">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-sm font-semibold text-gray-200">${escapeHtml(tech.name)}</span>
                                ${getConfidenceBadge(tech.confidence)}
                            </div>
                            ${tech.evidence && tech.evidence.length > 0 ? `
                                <div class="text-xs text-gray-500">
                                    <div class="mb-1">Evidence:</div>
                                    <ul class="list-disc list-inside space-y-0.5">
                                        ${tech.evidence.slice(0, 2).map(e => `
                                            <li class="truncate" title="${escapeHtml(e)}">${escapeHtml(e)}</li>
                                        `).join('')}
                                        ${tech.evidence.length > 2 ? `<li class="text-gray-600">+${tech.evidence.length - 2} more</li>` : ''}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    html += '</div>';

    // Add summary
    html = `
        <div class="mb-4 bg-dark-surface border border-dark-border rounded p-4">
            <div class="flex items-center justify-between">
                <div>
                    <div class="text-2xl font-bold text-gray-100">${technologies.length}</div>
                    <div class="text-xs text-gray-500">Technologies Detected</div>
                </div>
                <div class="text-xs text-gray-600">
                    ${Object.keys(byCategory).length} categories
                </div>
            </div>
        </div>
    ` + html;

    container.innerHTML = html;
};

function getConfidenceBadge(confidence) {
    const badges = {
        'high': '<span class="px-2 py-0.5 rounded text-xs bg-green-900/30 text-green-400 border border-green-800">High</span>',
        'medium': '<span class="px-2 py-0.5 rounded text-xs bg-yellow-900/30 text-yellow-400 border border-yellow-800">Medium</span>',
        'low': '<span class="px-2 py-0.5 rounded text-xs bg-gray-800/30 text-gray-400 border border-gray-700">Low</span>',
    };
    return badges[confidence] || badges['low'];
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}