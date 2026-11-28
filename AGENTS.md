PROJECT: Abay Garment, MERN e-commerce + factory management.
- client/: React 18, Vite 5, Redux Toolkit, Tailwind + shadcn/Radix, axios (baseURL + withCredentials set in src/main.jsx).
- server/: Express 4, Mongoose 8, ESM ("type": "module"), Node >= 18.
- Auth: httpOnly "token" cookie (JWT). server/middleware/auth.js exports requireAuth, requireRole(...roles), signAuthToken, authCookieOptions. requireAuth reloads the user from the DB on every request.
- Roles: buyer, seller, store_keeper, factman, accountant, admin.
- Payments: Chapa (server/routes/payment/*). Orders: server/controllers/shop/order-controller.js. Stock lives in StoreProduct.quantity; Product.totalStock is factory stock.
- Routers are mounted with role guards in server/server.js.

RULES
1. Do only what the task asks. No drive-by refactors, renames, or reformatting.
2. Never weaken or bypass requireAuth/requireRole. Never take userId/role/price/total from the request body.
3. Keep existing JSON response shapes unless you update every client call site in the same change.
4. No secrets in code, logs, or comments. Read config from process.env only.
5. Do not add dependencies unless the task says so; if one is needed, name it and why.
6. Commit in small steps with clear messages.
7. Before finishing run: `cd server && node --check` on every changed file (and `npm test` if tests exist); `cd client && npm run lint && npm run build`.
8. Finish with a report: files changed, behavior changes, what you did NOT do, and manual test steps.