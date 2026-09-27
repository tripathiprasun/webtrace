/**
 * Network Graph Visualization using Cytoscape.js
 * Shows relationships between target site, domains, and resources
 */

class NetworkGraph {
    constructor(containerId, data) {
        this.container = document.getElementById(containerId);
        this.data = data;
        this.cy = null;

        if (!this.container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        if (!window.cytoscape) {
            console.error('Cytoscape.js not loaded');
            return;
        }

        this.render();
    }

    render() {
        if (!this.data || !this.data.events || this.data.events.length === 0) {
            this.container.innerHTML = '<div class="text-center text-gray-500 py-8">No data to visualize</div>';
            return;
        }

        // Build graph data
        const graphData = this.buildGraphData();

        // Initialize Cytoscape
        this.cy = cytoscape({
            container: this.container,

            elements: graphData,

            style: [
                // Root node (target website)
                {
                    selector: 'node[type="root"]',
                    style: {
                        'background-color': '#10b981',
                        'label': 'data(label)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'color': '#ffffff',
                        'font-size': '12px',
                        'width': 60,
                        'height': 60,
                        'border-width': 2,
                        'border-color': '#059669',
                        'font-weight': 'bold'
                    }
                },

                // Domain nodes (first-party)
                {
                    selector: 'node[type="domain"][party="first"]',
                    style: {
                        'background-color': '#3b82f6',
                        'label': 'data(label)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'color': '#ffffff',
                        'font-size': '10px',
                        'width': 'data(size)',
                        'height': 'data(size)',
                        'border-width': 1,
                        'border-color': '#2563eb'
                    }
                },

                // Domain nodes (third-party)
                {
                    selector: 'node[type="domain"][party="third"]',
                    style: {
                        'background-color': '#f97316',
                        'label': 'data(label)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'color': '#ffffff',
                        'font-size': '10px',
                        'width': 'data(size)',
                        'height': 'data(size)',
                        'border-width': 1,
                        'border-color': '#ea580c'
                    }
                },

                // Resource type nodes
                {
                    selector: 'node[type="resource"]',
                    style: {
                        'background-color': 'data(color)',
                        'label': 'data(label)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'color': '#ffffff',
                        'font-size': '8px',
                        'width': 25,
                        'height': 25,
                        'border-width': 1,
                        'border-color': '#4b5563'
                    }
                },

                // Edges
                {
                    selector: 'edge',
                    style: {
                        'width': 1,
                        'line-color': '#4b5563',
                        'target-arrow-color': '#4b5563',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'opacity': 0.5
                    }
                },

                // Highlighted elements
                {
                    selector: ':selected',
                    style: {
                        'border-width': 3,
                        'border-color': '#10b981'
                    }
                }
            ],

            layout: {
                name: 'cose',
                idealEdgeLength: 100,
                nodeOverlap: 20,
                refresh: 20,
                fit: true,
                padding: 30,
                randomize: false,
                componentSpacing: 100,
                nodeRepulsion: 400000,
                edgeElasticity: 100,
                nestingFactor: 5,
                gravity: 80,
                numIter: 1000,
                initialTemp: 200,
                coolingFactor: 0.95,
                minTemp: 1.0
            },

            minZoom: 0.3,
            maxZoom: 3,
            wheelSensitivity: 0.2
        });

        // Add interaction handlers
        this.addInteractions();
    }

    buildGraphData() {
        const nodes = [];
        const edges = [];

        // Add root node (target website)
        const targetUrl = new URL(this.data.target_url);
        const rootId = `root-${targetUrl.hostname}`;

        nodes.push({
            data: {
                id: rootId,
                label: targetUrl.hostname,
                type: 'root'
            }
        });

        // Aggregate resources by domain
        const domainMap = new Map();
        const resourceTypeMap = new Map();

        this.data.events.forEach(event => {
            const hostname = event.hostname;
            if (!hostname) return;

            // Track domains
            if (!domainMap.has(hostname)) {
                domainMap.set(hostname, {
                    hostname: hostname,
                    isFirstParty: hostname === targetUrl.hostname || hostname.endsWith(`.${targetUrl.hostname}`),
                    requests: 0,
                    types: new Set()
                });
            }

            const domain = domainMap.get(hostname);
            domain.requests++;
            domain.types.add(event.resource_type || 'other');

            // Track resource types per domain
            const key = `${hostname}-${event.resource_type || 'other'}`;
            if (!resourceTypeMap.has(key)) {
                resourceTypeMap.set(key, {
                    hostname: hostname,
                    type: event.resource_type || 'other',
                    count: 0
                });
            }
            resourceTypeMap.get(key).count++;
        });

        // Add domain nodes
        domainMap.forEach((domain, hostname) => {
            const domainId = `domain-${hostname}`;
            const size = 30 + Math.min(domain.requests * 2, 40); // Scale based on request count

            nodes.push({
                data: {
                    id: domainId,
                    label: this.truncateLabel(hostname),
                    fullLabel: hostname,
                    type: 'domain',
                    party: domain.isFirstParty ? 'first' : 'third',
                    requests: domain.requests,
                    size: size
                }
            });

            // Edge from root to domain
            edges.push({
                data: {
                    source: rootId,
                    target: domainId
                }
            });

            // Add resource type nodes for this domain
            domain.types.forEach(resourceType => {
                const key = `${hostname}-${resourceType}`;
                const resourceData = resourceTypeMap.get(key);
                if (!resourceData) return;

                const resourceId = `resource-${hostname}-${resourceType}`;

                nodes.push({
                    data: {
                        id: resourceId,
                        label: this.getResourceTypeLabel(resourceType),
                        type: 'resource',
                        resourceType: resourceType,
                        count: resourceData.count,
                        color: this.getResourceTypeColor(resourceType)
                    }
                });

                // Edge from domain to resource type
                edges.push({
                    data: {
                        source: domainId,
                        target: resourceId
                    }
                });
            });
        });

        return {
            nodes: nodes,
            edges: edges
        };
    }

    addInteractions() {
        // Node click handler
        this.cy.on('tap', 'node', (event) => {
            const node = event.target;
            const data = node.data();

            this.showNodeInfo(data);
        });

        // Double click to fit
        this.cy.on('doubleTap', () => {
            this.cy.fit();
        });

        // Hover effect
        this.cy.on('mouseover', 'node', (event) => {
            const node = event.target;
            node.style('border-width', 3);
        });

        this.cy.on('mouseout', 'node', (event) => {
            const node = event.target;
            if (!node.selected()) {
                node.style('border-width', node.data('type') === 'root' ? 2 : 1);
            }
        });
    }

    showNodeInfo(data) {
        const infoBox = document.getElementById('graph-info');
        if (!infoBox) return;

        let html = '';

        if (data.type === 'root') {
            html = `
                <div class="text-sm">
                    <div class="text-xs text-gray-500 mb-1">Target Website</div>
                    <div class="font-semibold text-gray-200">${data.label}</div>
                </div>
            `;
        } else if (data.type === 'domain') {
            html = `
                <div class="text-sm space-y-2">
                    <div>
                        <div class="text-xs text-gray-500">Domain</div>
                        <div class="font-semibold text-gray-200">${data.fullLabel || data.label}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-500">Type</div>
                        <div class="text-xs">
                            ${data.party === 'first'
                                ? '<span class="text-blue-400">First-party</span>'
                                : '<span class="text-orange-400">Third-party</span>'}
                        </div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-500">Requests</div>
                        <div class="text-xs text-gray-300">${data.requests}</div>
                    </div>
                </div>
            `;
        } else if (data.type === 'resource') {
            html = `
                <div class="text-sm space-y-2">
                    <div>
                        <div class="text-xs text-gray-500">Resource Type</div>
                        <div class="font-semibold text-gray-200">${data.resourceType}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-500">Count</div>
                        <div class="text-xs text-gray-300">${data.count}</div>
                    </div>
                </div>
            `;
        }

        infoBox.innerHTML = html;
    }

    truncateLabel(text, maxLength = 20) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    getResourceTypeLabel(type) {
        const labels = {
            'document': 'DOC',
            'stylesheet': 'CSS',
            'script': 'JS',
            'image': 'IMG',
            'font': 'FONT',
            'xhr': 'XHR',
            'fetch': 'API',
            'media': 'MED',
            'websocket': 'WS',
            'other': 'OTH'
        };
        return labels[type] || 'OTH';
    }

    getResourceTypeColor(type) {
        const colors = {
            'document': '#a855f7',
            'stylesheet': '#3b82f6',
            'script': '#f59e0b',
            'image': '#10b981',
            'font': '#ec4899',
            'xhr': '#06b6d4',
            'fetch': '#06b6d4',
            'media': '#ef4444',
            'websocket': '#8b5cf6',
            'other': '#6b7280'
        };
        return colors[type] || '#6b7280';
    }

    fit() {
        if (this.cy) {
            this.cy.fit();
        }
    }

    destroy() {
        if (this.cy) {
            this.cy.destroy();
        }
    }
}

// Export for use in templates
window.NetworkGraph = NetworkGraph;