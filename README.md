# Match Realtime API

Backend API and realtime communication service for the Match Realtime application.

## Overview

This service provides:

- Cookie-based authentication
- Role-based authorization
- Match management
- Admin match settings
- Realtime match updates
- Redis Pub/Sub
- Socket.IO
- MessagePack binary serialization
- Payload compression
- MongoDB persistence

## Tech Stack

- Node.js
- TypeScript
- Express
- Socket.IO
- Redis
- MongoDB
- Mongoose
- MessagePack

## Architecture

```text
Angular Client
      |
      | HTTP / Socket.IO
      v
Node.js API
      |
      +------------------+
      |                  |
      v                  v
   MongoDB             Redis
      |               Pub/Sub
      |                  |
      +--------+---------+
               |
          Socket.IO
               |
               v
          Angular Client
````

## Project Structure

```text
src/
├── modules/
│   ├── auth/
│   ├── admin/
│   ├── matches/
│   └── realtime/
│       ├── binary.ts
│       ├── compression.ts
│       ├── redis.service.ts
│       └── realtime.publisher.ts
└── server.ts
```

## Requirements

* Node.js 24+
* npm 11+
* MongoDB
* Redis

## Installation

Install dependencies:

```bash
npm install
```

Create an environment file:

```bash
.env
```

Example:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/match-realtime
REDIS_URL=redis://localhost:6379
```

## Development

Start the development server:

```bash
npm run dev
```

Type-check the project:

```bash
npx tsc --noEmit
```

## Authentication

Authentication uses HTTP cookies.

Users are assigned roles such as:

* `USER`
* `ADMIN`

Admin-only endpoints require both authentication and the `ADMIN` role.

## Realtime Architecture

Match updates are published through Redis Pub/Sub.

```text
Match Data
    |
    v
MessagePack
    |
    v
Compression
    |
    v
Redis Pub/Sub
    |
    v
Socket.IO
    |
    v
Angular Client
```

Each match uses a dedicated Redis/Socket.IO channel:

```text
match:<matchId>
```

## License

ISC

````
