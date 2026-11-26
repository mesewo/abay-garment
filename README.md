# Abay Garment — E-commerce & Factory Management Platform

A full-stack MERN application for **Abay Garment**, a garment manufacturer and retailer in Ethiopia. It combines a customer storefront with role-based back-office tools for factory managers, store keepers, sellers, accountants, and administrators.

> Portfolio edition: the original academic project was audited, hardened, and cleaned up. See [Security model](#security-model) and [CHANGELOG.md](./CHANGELOG.md) for the P0 fixes.

---

## Highlights

- **Storefront** — browse products by store, search/filter, cart, addresses, checkout, Chapa payment, QR order receipt, reviews, and bulk quote requests.
- **Five staff roles** with dedicated dashboards and server-enforced permissions.
- **Factory inventory** — factory stock, per-store stock, stock requests, low-stock notifications, and delivery tracking.
- **Accountant workspace** — paid-order ledger, pending stock requests, revenue reports, and CSV export.
- **Secure auth** — httpOnly JWT cookie, server-verified Google Sign-In, hashed email OTPs with TTL, rate limiting, and role guards on every staff router.
- **Deploy-ready** — Vercel (client) + Render (server) with a `render.yaml` blueprint and SPA rewrites.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Client | React 18, Vite, Redux Toolkit, React Router, Tailwind CSS, Radix UI, Recharts, Axios |
| Server | Node.js, Express, MongoDB, Mongoose, JWT, bcrypt, Helmet, express-rate-limit |
| Integrations | Chapa payments, Google Identity, Cloudinary image uploads, Nodemailer |
| Deployment | Vercel (static client), Render (API) |

---

## Roles

| Role | Dashboard | Main capabilities |
| --- | --- | --- |
| `buyer` | `/shop/home` | Shop, cart, addresses, checkout, order history, feedback, bulk requests |
| `seller` | `/seller/dashboard` | Assigned store products, orders, stock requests, reports |
| `store_keeper` | `/storekeeper/dashboard` | Stores, sellers, store inventory, product requests, delivery |
| `factman` | `/factman/dashboard` | Factory products, factory stock, orders, staff, reports, features |
| `accountant` | `/accountant/dashboard` | Paid transactions, pending requests, revenue reports, CSV export |
| `admin` | `/admin/dashboard` | Users, products, orders, feedback, features, reports, settings |

Server-side authorization is enforced with `requireAuth` / `requireRole` in
[`server/middleware/auth.js`](./server/middleware/auth.js) and per-route mounts in
[`server/server.js`](./server/server.js). Hiding a link in the UI is never the only control.

---

## Project Structure

```text
abay-garment/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/     # role layouts, shared UI
│   │   ├── pages/          # route pages by role
│   │   └── store/          # Redux slices
│   ├── vercel.json         # SPA rewrites
│   └── .env.example
├── server/                 # Express API
│   ├── controllers/        # domain logic
│   ├── middleware/auth.js  # JWT + roles
│   ├── models/             # Mongoose schemas
│   └── routes/             # route modules
├── render.yaml             # Render blueprint
└── README.md
```

---

## Local Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Optional: Cloudinary, Chapa, Google OAuth, SMTP credentials

### 1. Server

```bash
cd server
npm install
cp .env.example .env        # Windows: copy .env.example .env
# edit .env with your values
npm run dev                 # http://localhost:5000
```

Minimum required variables:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/abay-garment
JWT_SECRET=replace-with-a-long-random-string
CLIENT_URL=http://localhost:5173
```

The API refuses to start without `MONGODB_URI` and `JWT_SECRET`.

### 2. Client

```bash
cd client
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm run dev                 # http://localhost:5173
```

```env
# No /api suffix. Leave empty to use the Vite proxy in development.
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=
```

### 3. Create the first admin

1. Register a normal account through the storefront and complete the OTP step.
2. In MongoDB Compass / `mongosh`, set that user's role:

```js
db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })
```

3. Log in again. The admin can create other staff accounts from **Admin → Users**, including accountants.

> In development, if `EMAIL_USER` / `EMAIL_PASS` are not set, the OTP is printed to the server console instead of being emailed.

---

## Environment Variables

### Server

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | no | API port (Render provides it) |
| `NODE_ENV` | no | `production` enables secure cross-site cookies |
| `MONGODB_URI` | **yes** | MongoDB connection string |
| `JWT_SECRET` | **yes** | Signs session JWTs |
| `JWT_EXPIRES_IN` | no | Token lifetime (default `7d`) |
| `CLIENT_URL` | **yes** | Frontend origin, used for CORS, Chapa return URL, reset links |
| `CLIENT_URLS` | no | Comma-separated extra allowed origins (preview deployments) |
| `GOOGLE_CLIENT_ID` | no | Server-side Google token audience |
| `CHAPA_SECRET_KEY` | no | Chapa payment API |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | no | Image uploads |
| `EMAIL_SERVICE` / `EMAIL_USER` / `EMAIL_PASS` / `EMAIL_FROM` | no | OTP and reset emails |

### Client

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Render API origin, **without** `/api` (e.g. `https://abay-api.onrender.com`) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID; must equal server `GOOGLE_CLIENT_ID` |

---

## Deployment

### Render (API)

1. Create a **Web Service** from the repository.
2. Root directory: `server`; build: `npm install`; start: `npm start`.
3. Health check path: `/api/health`.
4. Add the environment variables above. Set `NODE_ENV=production`, `CLIENT_URL=https://your-app.vercel.app`, and a strong `JWT_SECRET`.
5. Optional: use the included [`render.yaml`](./render.yaml) blueprint.

### Vercel (Client)

1. Import the repository; root directory `client`.
2. Framework preset: **Vite**. Build `npm run build`; output `dist`.
3. Add `VITE_API_URL=https://your-api.onrender.com` (no `/api`) and `VITE_GOOGLE_CLIENT_ID`.
4. `client/vercel.json` rewrites all routes to `index.html` for React Router.

### Post-deploy checks

- `GET https://your-api.onrender.com/api/health` returns `{ "success": true }`.
- Login sets an httpOnly `token` cookie (production: `SameSite=None; Secure`).
- Add the Vercel domain to the Google OAuth **Authorized JavaScript origins**.
- Set the Chapa callback/return origin through `CLIENT_URL`.

---

## Security Model

The original project trusted the client for identity, prices, roles, and payment results. This edition fixes that:

- **Central auth middleware** verifies the JWT cookie and reloads the user on every request, so blocks and role changes apply immediately.
- **Server-derived ownership** — cart, address, order, feedback, and payment controllers use `req.user.id`, never a `userId` from the body.
- **Server-derived pricing** — order lines are rebuilt from `Product` / `StoreProduct` documents; client-supplied prices, titles, and totals are ignored.
- **Atomic stock reservation** — conditional `$inc` updates prevent overselling and roll back on partial failure.
- **Payment integrity** — Chapa amount is taken from the order, payment is confirmed only by server-side verification, and an order cannot be paid twice.
- **Role guards on every staff router** — admin, factman, seller, store keeper, and accountant namespaces are protected at mount time.
- **Google Sign-In** — the raw `credential` is verified server-side with `google-auth-library`; the client no longer decodes and trusts it.
- **OTP hardening** — pending registrations live in MongoDB, the OTP is hashed, expires after 10 minutes, and is limited to 5 attempts.
- **Operational hardening** — Helmet, CORS allowlist, 1 MB JSON limit, auth/payment rate limits, `/api` 404 handler, and centralized error handling.

### Known limitations

- No automated test suite yet; verification is manual + `node --check`, ESLint, and production builds.
- A cart that contains items from more than one store creates one order per store; the checkout screen starts online payment for the first order only. Split-store carts should be paid/confirmed separately.
- Bulk orders are a **quote/request** flow: the team confirms availability and pricing before payment. Approving a bulk request records a pending order for the buyer.
- The app does not include database migrations or seed data; create the first admin manually as described above.
- QR codes identify an order for staff lookup; marking an order as QR-verified is available through the API but not yet a dedicated staff screen.

---

## Scripts

```bash
# client
npm run dev      # Vite dev server
npm run build    # production build
npm run lint     # ESLint (0 errors)

# server
npm run dev      # nodemon
npm start        # production start
```

---

## License

MIT — see [LICENSE](./LICENSE).
