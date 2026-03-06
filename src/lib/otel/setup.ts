import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

let sdk: NodeSDK | null = null;

const OTLP_ENDPOINT =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318";

export function initOtel(): void {
  if (sdk) return;

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "agentic-app-dev",
    [ATTR_SERVICE_VERSION]: "1.0.0",
  });

  sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({
      url: `${OTLP_ENDPOINT}/v1/traces`,
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${OTLP_ENDPOINT}/v1/metrics`,
      }),
      exportIntervalMillis: 10_000,
    }),
  });

  sdk.start();

  const shutdown = async () => {
    if (sdk) {
      await sdk.shutdown();
      sdk = null;
    }
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

export async function shutdownOtel(): Promise<void> {
  if (!sdk) return;
  await sdk.shutdown();
  sdk = null;
}
