# Pravah Subscription Management – Frontend

Vite + React (JavaScript) + Tailwind CSS. Talks to the `backend_test` Express API (`/api/v1`).

## Run
```bash
npm install
npm run dev        # http://localhost:5173
```
Start the backend first (default `http://localhost:5000`). In dev, Vite proxies `/api` to it,
so no CORS setup is needed. For a production build set `VITE_API_URL` to the full backend URL
and `FRONTEND_URL` in the backend environment to the public frontend URL, then run `npm run build`.

## What's inside
- **Everyone:** sign up, log in, forgot / reset password (`/reset-password/:token`), profile.
- **Customer portal:** own subscriptions (confirm quotation, pause/resume/close/renew when the plan allows), invoices (view/print), payments.
- **Staff:** dashboard, customers, subscriptions (create from template, send quotation, confirm, activate), invoices (generate due, confirm, cancel, send, print), record payments, read-only catalog.
- **Admin:** everything above plus products (with variants), plans, taxes, discounts, quotation templates and adding staff.
- **Dashboard:** active subscriptions, MRR/ARR, revenue, outstanding, overdue (with aging), recent payments, date filters.

## Password reset email
The backend sends users to the frontend reset page (`/reset-password/:token`). Set `FRONTEND_URL`
in the backend environment for production; it defaults to `http://localhost:5173` in development.
The frontend then submits the token to the backend reset endpoint.
