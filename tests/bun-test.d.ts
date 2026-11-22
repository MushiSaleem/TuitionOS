declare module 'bun:test' {
  export function describe(label: string, fn: () => void): void;
  export function test(label: string, fn: () => void | Promise<void>, timeout?: number): void;
  export function it(label: string, fn: () => void | Promise<void>, timeout?: number): void;
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;

  interface Matchers<T> {
    toBe(expected: T): void;
    toEqual(expected: unknown): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeNull(): void;
    toBeDefined(): void;
    toContain(expected: unknown): void;
    toHaveLength(expected: number): void;
    toBeGreaterThan(expected: number): void;
    toThrow(expected?: string | RegExp | Error | (new (...args: never[]) => Error)): void;
    not: Matchers<T>;
  }

  export function expect<T>(actual: T): Matchers<T>;
}
