export interface MetricLabels {
  [key: string]: string;
}
export interface CounterMetric {
  name: string;
  help: string;
  labels?: string[];
}
export interface HistogramMetric {
  name: string;
  help: string;
  buckets?: number[];
  labels?: string[];
}
