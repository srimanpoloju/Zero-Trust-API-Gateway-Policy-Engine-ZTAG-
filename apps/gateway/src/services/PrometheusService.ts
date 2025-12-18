import client from 'prom-client';
import { Counter, Histogram } from 'prom-client';

/**
 * Service for collecting and exposing Prometheus metrics.
 */
export class PrometheusService {
  // Prometheus metrics
  static metrics = {
    totalRequestsTotal: new Counter({
      name: 'ztag_gateway_total_requests_total',
      help: 'Total number of requests handled by the gateway',
    }),
    allowedRequestsTotal: new Counter({
      name: 'ztag_gateway_allowed_requests_total',
      help: 'Total number of requests allowed by policies',
    }),
    deniedRequestsTotal: new Counter({
      name: 'ztag_gateway_denied_requests_total',
      help: 'Total number of requests denied by policies',
      labelNames: ['code'], // e.g., 'MISSING_TOKEN', 'ACCESS_DENIED', 'INVALID_TOKEN'
    }),
    rateLimitedRequestsTotal: new Counter({
      name: 'ztag_gateway_rate_limited_requests_total',
      help: 'Total number of requests blocked by rate limits',
    }),
    requestDurationHistogram: new Histogram({
      name: 'ztag_gateway_request_duration_seconds',
      help: 'Histogram of request processing duration in seconds',
      buckets: client.app.requestDurationBuckets, // Default buckets
    }),
  };

  /**
   * Initializes Prometheus metrics collection.
   * Registers default metrics from prom-client.
   */
  static initialize(): void {
    client.collectDefaultMetrics();
    client.app.setDefaultLabels({ app: 'ztag-gateway' });
  }

  /**
   * Gets the current metrics in Prometheus text format.
   */
  static async getMetrics(): Promise<string> {
    return client.register.metrics();
  }

  /**
   * Gets the content type for Prometheus metrics.
   */
  static getMetricsContentType(): string {
    return client.register.contentType;
  }
}

// Initialize metrics when the service is imported
PrometheusService.initialize();
