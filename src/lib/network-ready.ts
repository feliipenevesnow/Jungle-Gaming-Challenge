let readiness: Promise<unknown> = Promise.resolve()

// Boot may paint loading UI while the network interceptor is being installed.
// Requests and the Socket.IO import wait for the same readiness barrier.
export function setNetworkReady(promise: Promise<unknown>) { readiness = promise }
export function waitForNetwork() { return readiness }
