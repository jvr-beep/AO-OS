# AO-OS API Tests

Test suite for the AO OS API. Includes integration tests and smoke harness for core workflows.

## Test Types

### 1. Integration Tests

Unit and integration tests using Jest, run in isolation with test database.

```bash
pnpm test:int
```

**Config**: `jest.integration.config.cjs`
**Pattern**: `test/integration/**/*.int-spec.ts`
**Examples**:
- `auth-rbac.int-spec.ts` – Role-based access control validation
- `access-presence-protections.int-spec.ts` – Locker access control
- `staff-lifecycle-protections.int-spec.ts` – Staff user lifecycle

### 2. Smoke Harness (Regression Test)

Full end-to-end validation of core operational workflows. Smoke tests verify that fundamental features remain unbroken after changes.

```bash
pnpm smoke:locker-policy
```

**Location**: `test/smoke/locker-policy-smoke.mjs`
**Requirements**:
- Running API server (default: `http://localhost:4000/v1`)
- At least one Location row in database
- All migrations applied
- Admin credentials (`admin@ao-os.dev` / `AdminPass123!`)

**Test Coverage**: 16 cases across credential lifecycle + locker policy
- Credential issue/activate/suspend/replace
- Locker policy evaluation and assignment
- Hard-blocked status denial and override handling
- Member access event logging

See [smoke/README.md](smoke/README.md) for detailed setup and troubleshooting.

## Running All Tests

```bash
# Integration tests + smoke harness
pnpm test:int && pnpm smoke:locker-policy
```

## CI/CD Integration

```yaml
- name: Run Integration Tests
  run: pnpm test:int

- name: Run Smoke Harness
  run: pnpm smoke:locker-policy
  env:
    AO_SMOKE_BASE_URL: "http://localhost:4000/v1"
```

## Test Database Setup

Integration tests use a temporary test database. To manually set up or inspect state:

```bash
# Generate Prisma client (required before tests)
pnpm prisma:generate

# Migrate development database
pnpm prisma:migrate-dev

# Apply migrations to test database
DATABASE_URL="postgresql://test:test@localhost/ao-os-test" pnpm prisma:migrate-dev
```

## Adding New Tests

### Integration Test
Add file with `*.int-spec.ts` pattern in `test/integration/`:

```typescript
// test/integration/my-feature.int-spec.ts
describe('My Feature', () => {
  it('should do something', async () => {
    // Test code
  });
});
```

Run with `pnpm test:int`.

### Smoke Test Case
Add case to `test/smoke/locker-policy-smoke.mjs` and update [smoke/README.md](smoke/README.md):

```javascript
const myRes = await post("/my-endpoint", { ...body }, token);
record("CASE N — My Test Case", { body }, myRes, `status: ${myRes.body?.status}`);
```

Run with `pnpm smoke:locker-policy`.

## Helpers

Available test helpers in `test/helpers/`:

- Authentication utilities
- Database seeding
- Fixture factories
- Mock data generators

## References

- [Project Status](../../PROJECT_STATUS.md)
- [State Transitions](../../STATE_TRANSITIONS.md)
- [Locker Policy Engine](../src/lockers/README.md)
- [Credential Lifecycle](../src/wristbands/README.md)
