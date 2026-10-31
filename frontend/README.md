# Brightloop Subscription Management – Frontend

Vite + React (JavaScript) + Tailwind CSS. Talks to the `backend_test` Express API (`/api/v1`).

## Run
```bash
npm install
npm run dev        # http://localhost:5173
```
Start the backend first (default `http://localhost:5000`). In dev, Vite proxies `/api` to it,
so no CORS setup is needed. For a production build set `VITE_API_URL` (see `.env.example`)
to the full backend URL and run `npm run build`.

## What's inside
- **Everyone:** sign up, log in, forgot / reset password (`/reset-password/:token`), profile.
- **Customer portal:** own subscriptions (confirm quotation, pause/resume/close/renew when the plan allows), invoices (view/print), payments.
- **Staff:** dashboard, customers, subscriptions (create from template, send quotation, confirm, activate), invoices (generate due, confirm, cancel, send, print), record payments, read-only catalog.
- **Admin:** everything above plus products (with variants), plans, taxes, discounts, quotation templates and adding staff.
- **Dashboard:** active subscriptions, MRR/ARR, revenue, outstanding, overdue (with aging), recent payments, date filters.

## Note on the password reset email
The backend emails a link to its own URL (`/api/v1/users/resetPassword/:token`).
Point that link to the frontend instead, i.e. `http://localhost:5173/reset-password/<token>`
(change `resetURL` in `authController.js`), or open that frontend URL by hand with the token from the email.
