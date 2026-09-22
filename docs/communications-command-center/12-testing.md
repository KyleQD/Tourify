# 12 - Testing

## Required Coverage

- route authorization for acting org/tour/event scope;
- RLS contract tests for new command-center tables;
- relay privacy tests proving source thread is not exposed to relay recipients;
- task creation from communication source;
- acknowledgement lifecycle;
- deterministic recipient resolution from assignments/departments;
- provider webhook signature failures;
- work inbox and existing Team Comms regressions.

## Existing Test Patterns

Use existing admin tests under `__tests__/admin/*` and logistics tests such as:

- `__tests__/admin/logistics-rls-contract.test.ts`
- `__tests__/admin/logistics-scope.test.ts`
- `__tests__/admin/workforce-authority.test.ts`

Run focused tests first, then `npm run typecheck` and broader suites when the implementation touches shared contracts.
