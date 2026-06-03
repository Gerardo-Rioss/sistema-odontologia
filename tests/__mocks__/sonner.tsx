/**
 * Mock for sonner toasts in Jest tests.
 */
export const toast = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
  loading: jest.fn(),
  dismiss: jest.fn(),
  promise: jest.fn(),
  custom: jest.fn(),
};

export const Toaster = () => null;
