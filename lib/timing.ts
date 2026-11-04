export async function timeQuery<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV !== "development") {
    return fn();
  }
  const start = performance.now();
  try {
    const result = await fn();
    const duration = (performance.now() - start).toFixed(2);
    console.log(`[perf:server] ${label}: ${duration}ms`);
    return result;
  } catch (err) {
    const duration = (performance.now() - start).toFixed(2);
    console.warn(`[perf:server:error] ${label} failed after ${duration}ms`);
    throw err;
  }
}

