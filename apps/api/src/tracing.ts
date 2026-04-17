// Must be imported before any other module.
// Initialises the Datadog APM tracer for the ao-os-api service.
import tracer from "dd-trace";

tracer.init({
  service: "ao-os-api",
  env: process.env.NODE_ENV ?? "production",
  version: "1.0.0",
  logInjection: true,   // injects trace/span IDs into console output
  runtimeMetrics: true, // ships Node.js runtime metrics (GC, heap, event loop)
});

export { tracer };
