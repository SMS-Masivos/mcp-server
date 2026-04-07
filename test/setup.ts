import { vi } from "vitest";

// Mock global fetch for all tests
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

export { mockFetch };
