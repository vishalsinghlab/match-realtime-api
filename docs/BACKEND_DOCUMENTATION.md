# Match Realtime API — Backend System Documentation

Welcome to the official backend technical documentation for the **Match Realtime API** microservice.

---

## 1. Executive Summary & Core Requirements

The **Match Realtime API** is a high-throughput, low-latency sports telemetry microservice built with **Node.js**, **Express 5**, **Socket.IO**, and **Redis**. It is specifically designed to stream live sports scores and telemetry data to connected web clients with minimal network overhead.

### Key Technical Capabilities
1. **Cookie-Based Authentication**: Manages session state via secure HTTP-Only cookies across both REST endpoints and WebSocket handshakes.
2. **Binary MessagePack Encoding**: Serializes real-time JS telemetry objects into binary buffers using `@msgpack/msgpack` instead of heavy JSON strings.
3. **Adaptive Brotli Payload Compression**: Automatically compresses binary payloads $\ge$ 256 bytes using Node `zlib` Brotli compression before transmission.
4. **Redis Pub/Sub Event Broker**: Decouples API servers from WebSocket Gateways, enabling horizontal scaling across multiple container nodes.
5. **Admin-Driven Hot Reloading**: Admins can dynamically alter streaming frequencies (e.g. 5s interval), telemetry modes, and enable/disable streams live without server restarts.

---

## 2. Technical Stack & Dependencies

- **Runtime Engine**: Node.js v20+ & TypeScript v5+
- **HTTP Web Server**: Express v5
- **Realtime Gateway**: Socket.IO v4
- **Event Broker & Cache**: Redis v6+ (`redis` client)
- **Database & ODM**: MongoDB v8+ & Mongoose ODM
- **Binary Serialization**: `@msgpack/msgpack` v3+
- **Compression**: Node.js native `zlib` (Brotli compression algorithm)

---

## 3. Architecture & Data Flow

```text
[ Admin Dashboard ] ---> REST API ---> Redis Pub/Sub (config:updated) ---> RealtimePublisher Engine
                                                                                     │
                                                                           MessagePack Binary
                                                                                     │
                                                                             Brotli Compress
                                                                                     │
[ User Dashboard ] <--- Socket.IO Room (match:101) <--- Redis Pub/Sub (match:101) ◄──┘
```

---

## 4. Authentication & Security Layer

### 4.1 REST Cookie Sessions
- On successful login (`POST /api/auth/login`), the backend generates a secure UUID session token.
- The session metadata (User ID, Role, Expiration) is stored in Redis under key `session:<token>`.
- The token is attached to the HTTP response as an `HttpOnly`, `SameSite=Lax` cookie named `session`.

### 4.2 WebSocket Handshake Authentication
When a client connects to the WebSocket Gateway (`ws://localhost:3000`), Socket.IO middleware intercepts the HTTP Upgrade request:
1. `socket.handshake.headers.cookie` is parsed to extract the `session` cookie.
2. `authenticateSocket()` checks Redis for an active session.
3. If valid, user metadata is bound to `socket.data.session` and connection proceeds.
4. If missing or expired, the connection is rejected with `Error("Authentication required")`.

---

## 5. Realtime Publisher & Pub/Sub Architecture

### 5.1 Binary Serialization & Brotli Compression Pipeline
Telemetry frames are processed through a two-stage encoding pipeline:
1. **MessagePack Stage**: JS object $\rightarrow$ `Uint8Array` binary byte array ([binary.ts](file:///c:/Users/user/Desktop/match-realtime-app/backend/match-realtime-api/src/modules/realtime/binary.ts)).
2. **Brotli Stage**: If byte length $\ge 256$, `brotliCompressSync` compresses the binary buffer ([compression.ts](file:///c:/Users/user/Desktop/match-realtime-app/backend/match-realtime-api/src/modules/realtime/compression.ts)).

### 5.2 Redis Channels
- `match:<matchId>`: Carries binary telemetry updates for specific live matches.
- `config:updated`: Carries administrative configuration change signals across all gateway instances.

### 5.3 Dynamic Room Subscriptions & Lifecycle
- When a user opens a match page, the client emits `match:join` with `matchId`.
- The gateway adds the socket to room `match:<matchId>` and triggers `realtimePublisher.start(matchId)`.
- `RealtimePublisher` fetches effective match settings (stream interval, data type) and begins streaming telemetry frames at that exact interval.
- When all clients leave a match room (`match:leave`), `realtimePublisher.stop(matchId)` cleans up memory timers.

---

## 6. REST API Endpoint Reference

### 6.1 Authentication (`/api/auth`)

#### `POST /api/auth/login`
Authenticates user credentials and sets `session` HTTP cookie.
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "user": {
      "id": "60d5ec49f1b2c812c4e8e9b1",
      "username": "admin",
      "role": "ADMIN"
    }
  }
  ```

#### `POST /api/auth/logout`
Destroys session in Redis and clears `session` cookie.

#### `GET /api/auth/me`
Returns current session metadata for the requesting user.

---

### 6.2 Matches Fixtures (`/api/matches`)

#### `GET /api/matches`
Returns all match fixtures.

#### `GET /api/matches/:id`
Returns single match fixture by ID.

#### `POST /api/matches` *(Admin Only)*
Creates a new match fixture.

---

### 6.3 Admin Dynamic Settings (`/api/admin`)

#### `GET /api/admin/settings/global` *(Admin Only)*
Retrieves global socket default settings.

#### `PUT /api/admin/settings/global` *(Admin Only)*
Updates global socket default settings and broadcasts `config:updated` over Redis.
- **Request Body**:
  ```json
  {
    "updateInterval": 3000,
    "dataType": "SCORE",
    "binary": true,
    "compression": true,
    "socketEnabled": true
  }
  ```

#### `GET /api/admin/matches/:id/settings` *(Admin Only)*
Retrieves specific match socket settings.

#### `PUT /api/admin/matches/:id/settings` *(Admin Only)*
Updates per-fixture socket settings and broadcasts `config:updated` over Redis.
- **Request Body**:
  ```json
  {
    "updateInterval": 5000,
    "dataType": "FULL",
    "useGlobalDefaults": false,
    "socketEnabled": true
  }
  ```

---

## 7. Socket.IO Event Protocol Reference

### Client $\rightarrow$ Server Events
| Event | Payload | Description |
|---|---|---|
| `match:join` | `matchId: string` | Client joins room `match:<matchId>` & starts stream timer |
| `match:leave` | `matchId: string` | Client leaves room `match:<matchId>` & triggers cleanup check |

### Server $\rightarrow$ Client Events
| Event | Payload Format | Description |
|---|---|---|
| `match:joined` | `{ matchId, room }` | Acknowledges successful room subscription |
| `match:update` | `Uint8Array` (Binary Buffer) | MessagePack + Brotli encoded live score update |

---

## 8. Development & Deployment Guide

### Local Environment Setup
1. Prerequisites: Node.js 20+, MongoDB (`mongodb://localhost:27017`), Redis (`redis://localhost:6379`).
2. Create `.env`:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/match-realtime
   REDIS_URL=redis://localhost:6379
   ```
3. Run Development Server:
   ```bash
   npm install
   npm run dev
   ```
