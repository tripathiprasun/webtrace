/**
 * Network Waterfall Visualization
 * Displays request timing information in a timeline format
 */

class NetworkWaterfall {
    constructor(containerId, data) {
        this.container = document.getElementById(containerId);
        this.data = data;
        this.rowHeight = 24;
        this.paddingTop = 40;
        this.paddingLeft = 300;
        this.paddingRight = 50;
        this.labelWidth = 280;

        if (!this.container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        this.render();
    }

    render() {
        if (!this.data || this.data.length === 0) {
            this.container.innerHTML = '<div class="text-center text-gray-500 py-8">No timing data available</div>';
            return;
        }

        // Calculate timeline bounds
        const startTimes = this.data.map(r => r.start_time).filter(t => t > 0);
        if (startTimes.length === 0) {
            this.container.innerHTML = '<div class="text-center text-gray-500 py-8">No timing data available</div>';
            return;
        }

        this.minTime = Math.min(...startTimes);
        this.maxTime = Math.max(...this.data.map(r => r.start_time + ((r.duration || 0) / 1000)));
        this.totalDuration = (this.maxTime - this.minTime) * 1000; // in ms

        // Build HTML
        const height = this.data.length * this.rowHeight + this.paddingTop + 20;
        const width = this.container.offsetWidth;
        const chartWidth = width - this.paddingLeft - this.paddingRight;

        let html = `
            <div class="waterfall-container" style="position: relative; height: ${height}px; overflow-x: auto;">
                ${this.renderTimeline(chartWidth)}
                ${this.renderRows(chartWidth)}
            </div>
        `;

        this.container.innerHTML = html;
    }

    renderTimeline(chartWidth) {
        // Create time markers
        const markerCount = 10;
        const step = this.totalDuration / markerCount;

        let markers = '';
        for (let i = 0; i <= markerCount; i++) {
            const time = i * step;
            const x = this.paddingLeft + (chartWidth * i / markerCount);
            markers += `
                <div style="position: absolute; left: ${x}px; top: 20px; width: 1px; height: 10px; background: #282828;"></div>
                <div style="position: absolute; left: ${x - 20}px; top: 5px; width: 40px; text-align: center; font-size: 10px; color: #666;">
                    ${Math.round(time)}ms
                </div>
            `;
        }

        return `
            <div style="position: absolute; top: 0; left: 0; right: 0; height: ${this.paddingTop}px; border-bottom: 1px solid #282828;">
                ${markers}
            </div>
        `;
    }

    renderRows(chartWidth) {
        let html = '';

        this.data.forEach((resource, index) => {
            const y = this.paddingTop + (index * this.rowHeight);

            // Calculate bar position and width
            const duration = resource.duration || 0;
            const startOffset = ((resource.start_time - this.minTime) * 1000); // ms from start
            const barX = this.paddingLeft + (startOffset / this.totalDuration) * chartWidth;
            const barWidth = Math.max(2, (duration / this.totalDuration) * chartWidth);

            // Get color based on resource type
            const color = this.getResourceColor(resource.resource_type);
            const statusColor = this.getStatusColor(resource.status);

            html += `
                <div class="waterfall-row" style="position: absolute; top: ${y}px; left: 0; right: 0; height: ${this.rowHeight}px; border-bottom: 1px solid #1a1a1a;">
                    <!-- Label -->
                    <div style="position: absolute; left: 8px; top: 0; width: ${this.labelWidth}px; height: ${this.rowHeight}px; display: flex; align-items: center; overflow: hidden;">
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs ${color}" style="font-size: 9px;">
                            ${resource.resource_type || 'other'}
                        </span>
                        <span class="ml-2 text-xs text-gray-400 truncate" style="max-width: 200px;" title="${this.escapeHtml(resource.url)}">
                            ${this.getFileName(resource.url)}
                        </span>
                    </div>

                    <!-- Timeline bar -->
                    <div style="position: absolute; left: ${barX}px; top: 6px; width: ${barWidth}px; height: 12px; background: ${this.getBarGradient(resource.resource_type)}; border-radius: 2px; cursor: pointer;"
                         class="waterfall-bar hover:opacity-80 transition-opacity"
                         title="${this.escapeHtml(resource.url)}\nStatus: ${resource.status || 'N/A'}\nDuration: ${duration}ms\nSize: ${this.formatBytes(resource.size)}">
                    </div>

                    <!-- Status -->
                    <div style="position: absolute; right: ${this.paddingRight + 60}px; top: 0; height: ${this.rowHeight}px; display: flex; align-items: center;">
                        <span class="text-xs ${statusColor}" style="font-size: 10px;">
                            ${resource.failed ? 'FAIL' : (resource.status || '-')}
                        </span>
                    </div>

                    <!-- Duration -->
                    <div style="position: absolute; right: 8px; top: 0; height: ${this.rowHeight}px; display: flex; align-items: center;">
                        <span class="text-xs text-gray-500 font-mono" style="font-size: 10px;">
                            ${duration}ms
                        </span>
                    </div>
                </div>
            `;
        });

        return html;
    }

    getResourceColor(type) {
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
        return colors[type] || colors['other'];
    }

    getBarGradient(type) {
        const colors = {
            'document': 'linear-gradient(90deg, #a855f7 0%, #9333ea 100%)',
            'script': 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)',
            'stylesheet': 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)',
            'image': 'linear-gradient(90deg, #34d399 0%, #10b981 100%)',
            'font': 'linear-gradient(90deg, #f472b6 0%, #ec4899 100%)',
            'xhr': 'linear-gradient(90deg, #22d3ee 0%, #06b6d4 100%)',
            'fetch': 'linear-gradient(90deg, #22d3ee 0%, #06b6d4 100%)',
            'media': 'linear-gradient(90deg, #f87171 0%, #ef4444 100%)',
            'other': 'linear-gradient(90deg, #6b7280 0%, #4b5563 100%)',
        };
        return colors[type] || colors['other'];
    }

    getStatusColor(status) {
        if (!status) return 'text-gray-500';
        if (status >= 200 && status < 300) return 'text-green-400';
        if (status >= 300 && status < 400) return 'text-blue-400';
        if (status >= 400 && status < 500) return 'text-orange-400';
        if (status >= 500) return 'text-red-400';
        return 'text-gray-400';
    }

    getFileName(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop() || urlObj.hostname;
            return filename || url;
        } catch (e) {
            return url;
        }
    }

    formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for use in templates
window.NetworkWaterfall = NetworkWaterfall;