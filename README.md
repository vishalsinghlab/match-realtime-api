# Match Realtime API

Backend REST API and real-time communication service for the Match Realtime application.

## Overview

This microservice provides:
- Cookie-based authentication & Redis session storage
- Role-based authorization (`USER`, `ADMIN`)
- Match fixture management & real-time telemetry publishing
- Dynamic hot-reloading socket settings (global & per-match overrides)
- Low-latency WebSocket streaming over Socket.IO
- Redis Pub/Sub event broker for horizontal gateway scaling
- Compact MessagePack binary serialization & zlib payload compression
- MongoDB persistence with Mongoose ODM

## Tech Stack

- **Runtime**: Node.js & TypeScript
- **Web Framework**: Express 5
- **Realtime**: Socket.IO v4
- **Broker & Cache**: Redis v6+
- **Database**: MongoDB v8+ & Mongoose
- **Serialization**: `@msgpack/msgpack`

## Project Structure

```text
src/
├── config/
│   └── database.ts               # MongoDB connection setup
├── modules/
│   ├── admin/                    # Admin settings routes, model & controllers
│   ├── auth/                     # Cookie session auth, middleware & socket auth
│   ├── matches/                  # Match fixture routes, controllers & models
│   └── realtime/
│       ├── binary.ts             # MessagePack encode/decode helpers
│       ├── compression.ts        # Zlib deflate/inflate helpers
│       ├── redis.service.ts      # Redis Publisher/Subscriber setup
│       ├── realtime.publisher.ts # Dynamic background telemetry engine
│       └── socket.service.ts     # Socket.IO room management & update dispatcher
└── server.ts                     # Main Express & Socket.IO server entrypoint
```

## Quick Start

### 1. Requirements
* Node.js 20+
* MongoDB running on `localhost:27017`
* Redis running on `localhost:6379`

### 2. Environment Setup
Create a `.env` file in the root directory:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/match-realtime
REDIS_URL=redis://localhost:6379
```

### 3. Installation & Running
```bash
# Install dependencies
npm install

# Start development server (with hot reload via tsx)
npm run dev

# Type-check TypeScript code
npx tsc --noEmit
```

### 4. Default Seed Accounts
On first database boot, the server automatically seeds the following credentials:
- **Admin**: `admin` / `admin123`
- **User**: `user` / `password123`

---

## API Reference

### Auth Endpoints (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticate user & set `session` cookie |
| `POST` | `/api/auth/logout` | Authenticated | Destroy session in Redis & clear cookie |
| `GET` | `/api/auth/me` | Authenticated | Return current authenticated user session |

### Match Endpoints (`/api/matches`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/matches` | Public | List all match fixtures |
| `GET` | `/api/matches/:id` | Public | Get single match fixture metadata |
| `POST` | `/api/matches` | Admin Only | Create a new match fixture |

### Admin Settings Endpoints (`/api/admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/admin/settings/global` | Admin Only | Get global socket defaults |
| `PUT` | `/api/admin/settings/global` | Admin Only | Update global defaults & trigger Redis config broadcast |
| `GET` | `/api/admin/matches/:id/settings` | Admin Only | Get specific match socket configuration |
| `PUT` | `/api/admin/matches/:id/settings` | Admin Only | Update match socket configuration & trigger Redis broadcast |

---

## Realtime Architecture & Pub/Sub

```text
Publisher Engine ---> MessagePack ---> Compression ---> Redis Pub/Sub ---> Socket.IO Gateway ---> Angular Client
```

### Redis Channels
- **`config:updated`**: Broadcasts admin configuration changes to all publisher nodes for zero-downtime hot reloading.
- **`match:<matchId>`**: Carries binary MessagePack telemetry updates for active match rooms.

### Socket.IO Client Events
- **Join Match Room**: `socket.emit('match:join', matchId)`
- **Leave Match Room**: `socket.leave('match:leave', matchId)`
- **Receive Telemetry Update**: `socket.on('match:update', (binaryUint8Array) => ...)`

## License
ISC
