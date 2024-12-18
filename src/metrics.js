const config = require('./config.js');
const os = require('os');

class Metrics {
    constructor() {
        // Initialize the total request counters
        this.totalGetRequests = 0;
        this.totalPostRequests = 0;
        this.totalDeleteRequests = 0;
        this.totalPutRequests = 0;
        
        // Initialize the active users
        this.activeUsers = 0;
        
        // Initialize authentication metrics
        this.authSuccess = 0;
        this.authFailure = 0;
        
        // Initialize purchase metrics
        this.totalPurchases = 0;
        this.failedCreations = 0;
        this.totalRevenue = 0;
        
        this.sendMetricsPeriodically(1000);
    }

    getCpuUsagePercentage() {
        const cpuUsage = os.loadavg()[0] / os.cpus().length;
        return cpuUsage.toFixed(2) * 100;
    }

    getMemoryUsagePercentage() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsage = (usedMemory / totalMemory) * 100;
        return memoryUsage.toFixed(2);
    }
    
    addActiveUser() {
        this.activeUsers++;
    }
    removeActiveUser() {
        if (this.activeUsers > 0) {
            this.activeUsers--;
        }
    }
    
    requestTracker(req, res, next) {
        if (req.method === 'GET') {
            this.totalGetRequests++;
        } else if (req.method === 'POST') {
            this.totalPostRequests++;
        } else if (req.method === 'DELETE') {
            this.totalDeleteRequests++;
        } else if (req.method === 'PUT') {
            this.totalPutRequests++;
        }
        next();
    }

    authTracker(req, res, next) {
        res.on('finish', () => {
            if (res.statusCode === 200) {
                this.authSuccess++;
            } else {
                this.authFailure++;
            }
        });
        next();
    }
    
    purchaseTracker(req, res, next) {
        res.on('finish', () => {
            if (res.statusCode === 200) {
                if (req.body.items.length > 0) {
                    this.totalPurchases += req.body.items.length;
                    this.totalRevenue += req.body.items.reduce((sum, item) => sum + item.price, 0);
                }
            } else if (res.statusCode === 500) {
                this.failedCreations++;
            }
        });
        next();
    }
    
    serviceLatencyTracker(req, res, next) {
        const startTime = Date.now();
        res.on('finish', () => {
            const endTime = Date.now();
            const latency = endTime - startTime;
            this.sendMetricToGrafana(`service_latency,source=${config.metrics.source} latency=${latency}`);
        });
        next();
    }
    
    async pizzaCreationLatencyTracker(fn, ...args) {
        const startTime = Date.now();
        const result = await fn(...args);
        const endTime = Date.now();
        const latency = endTime - startTime;
        this.sendMetricToGrafana(`pizza_creation_latency,source=${config.metrics.source} latency=${latency}`);
        return result;
    }
    
    sendMetricsPeriodically(period) {
        const timer = setInterval(() => {
            const httpMetrics = (buf) => {
                buf.addMetric('request', 'total', this.totalGetRequests + this.totalPostRequests + this.totalDeleteRequests + this.totalPutRequests, { method: 'all' });
                buf.addMetric('request', 'total', this.totalGetRequests, { method: 'GET' });
                buf.addMetric('request', 'total', this.totalPostRequests, { method: 'POST' });
                buf.addMetric('request', 'total', this.totalDeleteRequests, { method: 'DELETE' });
                buf.addMetric('request', 'total', this.totalPutRequests, { method: 'PUT' });
            }
            
            const systemMetrics = (buf) => {
                buf.addMetric('system', 'usage', this.getCpuUsagePercentage(), { type: 'cpu' });
                buf.addMetric('system', 'usage', this.getMemoryUsagePercentage(), { type: 'memory' });
            }
            
            const userMetrics = (buf) => {
                buf.addMetric('user', 'active', this.activeUsers);
            }
            
            const purchaseMetrics = (buf) => {
                buf.addMetric('purchase', 'total', this.totalPurchases, { status: 'sold' });
                buf.addMetric('purchase', 'total', this.failedCreations, { status: 'failed' });
                buf.addMetric('purchase', 'revenue', this.totalRevenue);
            }
            
            const authMetrics = (buf) => {
                buf.addMetric('auth', 'total', this.authSuccess, { status: 'success' });
                buf.addMetric('auth', 'total', this.authFailure, { status: 'failure' });
            }

            try {
                const buf = new MetricBuilder();
                httpMetrics(buf);
                systemMetrics(buf);
                userMetrics(buf);
                purchaseMetrics(buf);
                authMetrics(buf);
        
                const metrics = buf.toString('\n');
                this.sendMetricToGrafana(metrics);
            } catch (error) {
                console.log('Error sending metrics', error);
            }
        }, period);
        timer.unref();
    }

    sendMetricToGrafana(metric) {
        fetch(`${config.metrics.url}`, {
            method: 'post',
            body: metric,
            headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
        })
            .then((response) => {
                if (!response.ok) {
                    console.error('Failed to push metrics data to Grafana');
                } else {
                    console.log(`Pushed ${metric}`);
                }
            })
            .catch((error) => {
                console.error('Error pushing metrics:', error);
            });
    }
}

class MetricBuilder {
    constructor() {
        this.metrics = [];
    }

    addMetric(metricPrefix, name, value, labels = {}) {
        const labelString = Object.entries(labels)
            .map(([key, val]) => `${key}="${val}"`)
            .join(',');
        
        this.metrics.push(`${metricPrefix},source=${config.metrics.source}${(Object.keys(labels).length > 0) ? ',' : ''}${labelString} ${name}=${value}`);
    }

    toString(separator = '\n') {
        return this.metrics.join(separator);
    }

    reset() {
        this.metrics = [];
    }
}

const metrics = new Metrics();
module.exports = metrics;