// expo-router/testing-library registers these matchers at runtime but ships
// no type declarations for them.
declare namespace jest {
  interface Matchers<R> {
    toHavePathname(pathname: string): R;
    toHavePathnameWithParams(pathnameWithParams: string): R;
    toHaveSegments(segments: string[]): R;
    toHaveSearchParams(params: Record<string, string | string[]>): R;
    toHaveRouterState(state: unknown): R;
  }
}
