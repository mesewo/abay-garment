# Changelog — Portfolio Hardening

This release focuses on correctness, security, and deployability. No new business
features were invented beyond completing the accountant role and making the bulk
flow coherent.

## Security (P0)

- Added shared `requireAuth` / `requireRole` middleware and applied role guards to
  every admin, factman, seller, store keeper, accountant, cart, address, order,
  feedback, and payment router.
- Replaced client-decoded Google Sign-In with server-side `verifyIdToken`.
- Moved JWT signing to `JWT_SECRET`; removed the hard-coded secret and secret logging.
- Moved pending registrations from an in-memory map to MongoDB (`PendingUser`) with
  a hashed OTP, 10-minute TTL, and attempt limit.
- Made account settings self-only. Staff can no longer rename or reset another
  user's account; password changes require the current password.
- Derived cart, address, feedback, bulk-cart, and order ownership from the session
  instead of request parameters.
- Rebuilt order pricing server-side from `Product` / `StoreProduct`; added atomic
  stock reservation with rollback.
- Reworked payments: amount comes from the order, ownership is checked, Chapa
  verification is server-side, and paid orders cannot be paid twice.
- Restricted factman user management: no admin/accountant/factman escalation.
- Added Helmet, credential-aware CORS allowlist, JSON size limit, auth/payment rate
  limits, a health endpoint, and centralized error handling.
- Restricted uploads to 5 MB image files and removed signature debug logging.
- Secured inventory updates and seller order/request ownership checks.

## Accountant Role

- Added `/api/accountant` endpoints for paid transactions, pending product
  requests, and aggregate stats.
- Added a complete accountant UI: layout, sidebar, header, dashboard, transactions
  with CSV export, requests, and revenue reports.
- Kept `/api/admin/accountant` for administrators and enabled the admin sidebar link.

## Client Correctness

- Set global Axios `baseURL` and `withCredentials`; removed hard-coded API URLs.
- Replaced the fake “payment static success” page with real server verification and
  an order QR code.
- Converted bulk checkout from an untethered Chapa payment to a quote/request flow
  with delivery address and success state.
- Fixed the factman order screen to use factman endpoints and validated statuses.
- Fixed `/store-keeper` → `/storekeeper` redirect, missing imports, address keys,
  and seller layout casing.
- Aligned the seller status dropdown with the server (`inProcess`, `inShipping`,
  `shipped`, `delivered`) and stopped offering invalid transitions.
- Made QR receipts contain the raw order id so the in-app staff scanner works.
- Added conditional Google provider/button so the app runs without a client ID.

## Stock & Bulk Flow

- Normal store sales now decrement only the store allocation (`StoreProduct.quantity`)
  and increment `Product.soldCount`; factory stock moves only when a storekeeper
  approves a request. This removes a double-decrement bug.
- Product-request approval is atomic and only creates a buyer order for bulk buyer
  requests with a delivery address; seller replenishment requests just move stock.
- Bulk requests require a delivery address and phone number server-side.
- Removed dead bulk-order approval helpers, a placeholder replenishment endpoint,
  and unused server dependencies.

## Cleanup & Tooling

- Deleted legacy migration scripts, chat context, duplicated factman order UI,
  dead storekeeper table, and timestamped Vite configs.
- Configured ESLint for the project: `react/prop-types` off, Node globals for config
  files, unused vars as warnings. `npm run lint` now exits with 0 errors.
- Added `.env.example` files, `.gitignore`, `client/vercel.json`, `render.yaml`,
  MIT `LICENSE`, and deployment documentation.

## Verification

- `node --check` passes for every server file; the server resolves all imports and
  fails only on the intentionally unreachable test database.
- `npm run lint` → 0 errors (85 warnings, mostly unused locals).
- `npm run build` → Vite production build succeeds.
- Client and server paths were cross-checked against the route mounts.
