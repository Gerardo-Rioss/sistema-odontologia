/**
 * Type declarations for jest-axe v8.
 *
 * jest-axe does not ship its own types, so we declare the module export shape
 * and augment Jest's matchers to include `toHaveNoViolations`.
 */

declare module "jest-axe" {
  export interface AxeResults {
    violations: AxeViolation[];
    passes: AxeResult[];
    incomplete: AxeResult[];
    inapplicable: AxeResult[];
  }

  export interface AxeViolation {
    id: string;
    impact: string;
    tags: string[];
    description: string;
    help: string;
    helpUrl: string;
    nodes: AxeNodeResult[];
  }

  export interface AxeNodeResult {
    html: string;
    target: string[];
    any: AxeCheck[];
    all: AxeCheck[];
    none: AxeCheck[];
    impact: string;
    failureSummary: string;
  }

  export interface AxeCheck {
    id: string;
    impact: string;
    message: string;
    data: unknown;
    relatedNodes: unknown[];
  }

  export interface AxeResult {
    id: string;
    impact: string;
    tags: string[];
    description: string;
    help: string;
    helpUrl: string;
    nodes: AxeNodeResult[];
  }

  export function axe(
    element: Element | Document | Node,
    options?: Record<string, unknown>,
  ): Promise<AxeResults>;

  export const toHaveNoViolations: {
    toHaveNoViolations(): {
      pass: boolean;
      message: () => string;
    };
  };

  export default axe;
}

declare namespace jest {
  interface Matchers<R> {
    toHaveNoViolations(): R;
  }
}
