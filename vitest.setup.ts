import { vi } from 'vitest'
import { setupGlobalMocks, resetAllMocks } from './tests/setup/mocks'

// Setup all global mocks
setupGlobalMocks()

// Global test setup
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Export reset function for use in tests
export { resetAllMocks }
