# LAS / ISUZET Fleet Management Launch Readiness

This launch profile exposes only the fleet owner Business app and the driver Field app. Broker, orderer, and agent screens remain in the codebase but are not reachable from normal launch navigation.

## Launch Scope

- Fleet owner registration, OTP login, fleet dashboard, truck CRUD, driver invite/edit/deactivate, and fleet map states.
- Driver registration/OTP, profile/KYC, availability/status, assigned loads/trips, GPS pings, delivery confirmation, earnings, and incident/SOS.
- Backend fleet APIs live under `engine-dispatch` at `/api/v1/dispatch/fleet`.

## Required Runtime Services

- Postgres for Prisma application data.
- Redis for fleet live-location cache and auth/OTP helpers.
- SMS provider for OTP and driver invites. The fleet invite path falls back to console logging when the notification engine is unavailable, but production should run `notification-engine`.
- Identity, dispatch, and location engines must all be running behind the app-configured base URLs.

## Backend Environment

Set these before launching the engines:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY`, or the equivalent shared-auth key configuration used by this deployment.
- `IDENTITY_PORT`, default identity service port expected by the apps.
- `DISPATCH_PORT`, default dispatch service port expected by the apps.
- `LOCATION_PORT`, default location service port expected by the apps.
- `NOTIFICATION_PORT`, used by fleet driver invites at `http://localhost:3013/internal/sms` in the local profile.
- SMS credentials for the configured provider, or explicitly accept SMS mock fallback for pilot testing only.

## Fleet API Contract

Fleet-owner auth must use JWT `entity_id` as the `FleetOwner.id`. JWT `sub` is the user id and must not be used for fleet ownership checks.

The production fleet API returns `success/data` envelopes and mobile-compatible DTO aliases:

- Trucks include `plateNumber`, `licensePlate`, `currentDriverId`, `driverId`, `capacityKg`, `status`, timestamps, and `fleetOwnerId`.
- Drivers include `fullName`, `phone`, `licenseNumber`, `active`, `status`, payment fields, timestamps, and `fleetOwnerId`.
- Lists exclude soft-deleted trucks and deactivated/unlinked drivers.

## Smoke Test

1. Register a fleet owner in the Business app.
2. Verify OTP and land on `/fleet`.
3. Invite an existing or new driver by phone.
4. Add a truck with plate and capacity.
5. Assign the driver to the truck.
6. Log in to the Field app as the driver.
7. Send a GPS ping from the driver app.
8. Confirm the fleet owner sees the truck/driver state and map empty/live states without broker/orderer navigation.

## Verification Notes

- Backend TypeScript should compile directly for `engine-identity`, `engine-dispatch`, `engine-location`, and `shared-db`.
- Flutter/Dart analyze currently hangs locally in this workspace; do not treat a missing Flutter analyze result as a pass.
- `Backend/tests/integration/fleet-management-launch.test.ts` documents the server-side ownership and lifecycle contracts. Wire it into the repo test runner before relying on automated CI enforcement.
