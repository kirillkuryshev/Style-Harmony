# Style Harmony

A portfolio demo of a home goods store. React handles the frontend, Go provides the API, and SQLite stores accounts and orders. The six products were recovered from an old Firebase Realtime Database export; the images come from the original project.

## Features

- Product catalog and category filters.
- Cart and checkout.
- Registration, sign-in, profile, and order history.
- Server-side order totals based on catalog prices.

Payment is **on delivery only**. This demo does not charge customers or send orders to a real store. Old Firestore accounts and orders were not imported because the original database stored passwords in plain text.

## Run locally

Requires Go 1.26 and Node.js with npm.

In the first terminal:

```powershell
cd backend
go run .
```

In the second terminal, from the project root:

```powershell
npm ci --legacy-peer-deps
npm start
```

Open `http://localhost:3000`. React proxies `/api` requests to the Go server at `http://localhost:8080`. On first run, SQLite creates `backend/data/shop.db`, which is excluded from Git.

Run `npm run build` to build the frontend. To serve the build with Go, set `SHOP_BUILD_DIR=../build` when starting the server from `backend`. For deployment, use HTTPS and persistent storage for SQLite; set the database path with `SHOP_DB_PATH`.

## API

`GET /api/products`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET/PUT /api/me`, `GET/POST /api/orders`.

New account passwords are hashed with bcrypt. Sessions use an HttpOnly cookie. Product data is in [backend/data/products.json](backend/data/products.json).

## Background

This is an update to an older project of mine. The downloaded archive contained React code and images, while product data lived separately in Firebase. I restored the catalog from an export and replaced the Firebase integration with a Go API.
