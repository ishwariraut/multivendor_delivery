# Location Tracker Platform

A full-stack, real-time location tracking platform for a multi-vendor delivery system. Built with **Next.js** (React) for the frontend, **Node.js/Express** for the backend, **Prisma** for ORM, and **Socket.IO** for live updates.

---

## 📸 Screenshots

<!-- Add your screenshots in the assets/screenshots/ folder and reference them here -->

### 🧑‍💼 Login / Register

![Login Page](./assets/screenshots/login.png)

### 🚚 Real-Time Delivery Tracking

![Tracking Map](./assets/screenshots/tracking-map.png)

### 🛒 Vendor Dashboard

![Vendor Dashboard](./assets/screenshots/vendor-dashboard.png)

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
  - [Backend](#backend)
  - [Frontend](#frontend)
- [Environment Variables](#environment-variables)
- [Database Migration](#database-migration)
- [Running the App](#running-the-app)
- [Usage](#usage)
- [Socket.IO Real-Time Tracking](#socketio-real-time-tracking)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **User Roles:** Vendor, Delivery Partner, Customer
- **Authentication:** JWT-based, secure login/register
- **Order Management:** Vendors can create/manage orders, assign delivery partners
- **Real-Time Tracking:** Live delivery partner location updates using Socket.IO and Google Maps
- **Customer Tracking:** Customers can track their orders in real time
- **Responsive UI:** Built with Material-UI and Google Maps integration
- **Robust Backend:** Express.js REST API, Prisma ORM, and secure middleware

---

## Architecture

- **Frontend:** Next.js app with React, Material-UI, Google Maps, and Socket.IO client
- **Backend:** Express.js REST API, Socket.IO server, Prisma ORM, JWT authentication
- **Database:** PostgreSQL (configurable via Prisma)
- **Real-Time:** Socket.IO for live location updates and order status

---

## Tech Stack

- **Frontend:** Next.js, React, Material-UI, Google Maps API, Socket.IO Client
- **Backend:** Node.js, Express.js, Prisma, Socket.IO, JWT, PostgreSQL
- **Other:** TypeScript, dotenv, Axios, Jest (for testing)

---

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── socket.ts
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── socket/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── hooks/
│   │   └── utils/
│   ├── .env.local
│   ├── package.json
│   └── tsconfig.json
├── package.json
└── README.md
```

---

## Setup & Installation

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- PostgreSQL (or another supported DB for Prisma)

### Backend

1. **Install dependencies:**
   ```sh
   cd backend
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in your values (DB, JWT, etc.)

3. **Set up the database:**
   ```sh
   npx prisma migrate dev --name init
   ```

4. **Build and run the backend:**
   ```sh
   npm run build
   npm start
   ```
   - For development with hot-reload:
     ```sh
     npm run dev
     ```

### Frontend

1. **Install dependencies:**
   ```sh
   cd frontend
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.local.example` to `.env.local` and set:
     - `NEXT_PUBLIC_API_URL` (e.g., `http://localhost:3001`)
     - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

3. **Run the frontend:**
   ```sh
   npm run dev
   ```

---

## Environment Variables

### Backend (`backend/.env`)

- `DATABASE_URL` — Prisma DB connection string
- `JWT_SECRET` — Secret for JWT signing
- `FRONTEND_URL` — Allowed CORS origin (e.g., `http://localhost:3000`)

### Frontend (`frontend/.env.local`)

- `NEXT_PUBLIC_API_URL` — Backend API URL (e.g., `http://localhost:3001`)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Google Maps API key

---

## Database Migration

- **Create migration:**
  ```sh
  cd backend
  npx prisma migrate dev --name <migration_name>
  ```
- **Generate Prisma client:**
  ```sh
  npx prisma generate
  ```

---

## Running the App

1. **Start the backend:**
   ```sh
   cd backend
   npm run dev
   ```
2. **Start the frontend:**
   ```sh
   cd frontend
   npm run dev
   ```
3. **Access the app:**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API: [http://localhost:3001](http://localhost:3001)

---

## Usage

- **Register** as a Vendor, Delivery Partner, or Customer.
- **Vendors** can create orders and assign delivery partners.
- **Delivery Partners** update their live location (simulated or via device).
- **Customers** can track their orders in real time on a map.

---

## Socket.IO Real-Time Tracking

- **Backend:** Authenticates each socket connection using JWT.
- **Frontend:** Connects to the backend via Socket.IO, joins order-specific rooms, and listens for `location-update` events.
- **Live Map:** Customer and vendor dashboards update in real time as delivery partner locations change.

---

## API Endpoints

- **Auth:** `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- **Orders:** `/api/orders`, `/api/orders/:id`, `/api/orders/:id/track`
- **Users:** `/api/users/vendors`, `/api/users/delivery-partners`
- **Location:** `/api/location/update` (for delivery partners)
- **Socket.IO:** `/socket.io` (real-time events)

> See backend route files for detailed request/response formats.

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

---


## Contact

For questions or support, please open an issue or contact the maintainer.
