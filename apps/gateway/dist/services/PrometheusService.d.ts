import client from 'prom-client';
/**
 * Service for collecting and exposing Prometheus metrics.
 */
export declare class PrometheusService {
    static metrics: {
        totalRequestsTotal: client.Counter<string>;
        allowedRequestsTotal: client.Counter<string>;
        deniedRequestsTotal: client.Counter<"code">;
        rateLimitedRequestsTotal: client.Counter<string>;
        requestDurationHistogram: client.Histogram<string>;
    };
    /**
     * Initializes Prometheus metrics collection.
     * Registers default metrics from prom-client.
     */
    static initialize(): void;
    /**
     * Gets the current metrics in Prometheus text format.
     */
    static getMetrics(): Promise<string>;
    /**
     * Gets the content type for Prometheus metrics.
     */
    static getMetricsContentType(): string;
}
//# sourceMappingURL=PrometheusService.d.ts.map