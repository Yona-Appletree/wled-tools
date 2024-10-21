export function timeoutPromise(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
