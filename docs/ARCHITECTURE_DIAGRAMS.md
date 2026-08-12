# System Architecture & Data Flow Diagrams

This document contains visual diagrams illustrating the overall architecture, authentication flow, real-time message pipeline, and data transformation process for the **Match Realtime API**.

---

## 🏗️ 1. Overall System Architecture Diagram

This diagram shows how the **Admin App**, **User App**, **Microservice Backend**, **Redis Pub/Sub**, and **Socket Gateway** interact with each other.

```mermaid
flowchart TB
    subgraph Frontend["Frontend (Angular App)"]
        AdminUI["Admin Panel\n(/admin/matches)"]
        UserUI["User Panel & Match Details\n(/user/matches/:matchId)"]
    end

    subgraph AuthLayer["Authentication & Security"]
        CookieAuth["HTTP-Only Cookie Auth\n(Session Token in Handshake Header)"]
    end

    subgraph BackendServices["Microservices Backend Node.js API"]
        AdminService["Admin & Match Service\n(REST API Routes)"]
        
        subgraph RealtimeEngine["Realtime Socket Gateway"]
            SocketServer["Socket.IO Server\n(io.use Handshake Middleware)"]
            Encoder["MessagePack Encoder\n(@msgpack/msgpack)"]
            Compressor["Brotli Compressor\n(zlib Brotli)"]
        end
    end

    subgraph RedisBroker["Redis Layer"]
        RedisPubSub[("Redis Pub/Sub Broker\n• Channel: match:matchId\n• Channel: config:updated")]
        RedisStore[("Redis Session Store\n• Key: session:sessionId")]
    end

    %% Interactions
    AdminUI -->|"1. REST API (HTTPS)\nSave dynamic socket settings"| AdminService
    UserUI -->|"2. Cookie Login (/api/auth/login)"| CookieAuth
    
    UserUI -->|"3. WS Connect (withCredentials: true)\nWebSocket Handshake"| SocketServer
    SocketServer <-->|"4. Verify Cookie Session"| RedisStore
    
    AdminService -->|"5. Publish Config & Match Updates"| RedisPubSub
    RedisPubSub -->|"6. Subscribe to match:* channels"| SocketServer
    
    SocketServer -->|"7. Encode & Compress Payload"| Encoder
    Encoder --> Compressor
    Compressor -->|"8. Binary Uint8Array Stream\n(via Socket.IO Room match:matchId)"| UserUI
```

---

## 🔄 2. Step-by-Step Data Flow Diagram

The sequence of events when a user opens a live match detail page and receives real-time binary updates triggered by backend events/admin actions:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as 👨‍💼 Admin
    participant AdminUI as Admin Panel
    participant REST as Admin REST Service
    participant Redis as Redis Pub/Sub
    participant Gateway as WebSocket Gateway
    actor User as 👤 User
    participant UserUI as Match Details Page

    %% Step A: User Connection & Auth
    Note over User, Gateway: Phase 1: User Connection & Cookie Auth
    User->>UserUI: Opens Match Detail (/user/matches/101)
    UserUI->>Gateway: WS Handshake Request (Includes Cookie: session=xyz)
    Gateway->>Gateway: `authenticateSocket()` validates session cookie
    Gateway-->>UserUI: Connection Accepted
    UserUI->>Gateway: Emit `match:join` ("101")
    Gateway->>Gateway: Add Socket to Room (`match:101`)

    %% Step B: Admin Update / Live Simulation
    Note over Admin, UserUI: Phase 2: Live Update & Binary Stream Pipeline
    Admin->>AdminUI: Configures Dynamic Score / Settings
    AdminUI->>REST: POST /api/admin/matches/101/update
    REST->>Redis: Publish to Redis Channel `match:101`
    
    Redis-->>Gateway: Message received on `match:101` subscriber
    
    rect rgb(230, 245, 255)
        Note over Gateway: Phase 3: Binary Encoding & Compression Pipeline
        Gateway->>Gateway: 1. Convert JSON payload -> MessagePack Binary
        Gateway->>Gateway: 2. If payload >= 256 bytes -> Compress with Brotli
    end

    Gateway-->>UserUI: Emit `match:update` with Binary Buffer (Uint8Array)
    
    rect rgb(240, 255, 240)
        Note over UserUI: Phase 4: Client Decoding
        UserUI->>UserUI: `@msgpack/msgpack` decodes Uint8Array -> JS Object
        UserUI->>User: Updates UI Live Score dynamically!
    end
```

---

## 📦 3. Data Transformation Pipeline

How JSON Data transforms into MessagePack Binary & Brotli compressed bytes on backend, and decodes on frontend:

```mermaid
flowchart LR
    subgraph ServerSide["Backend Encoding"]
        A["JSON Object\n{ matchId: '101',\n  score: {home: 2, away: 1}\n}"] --> B["MessagePack Encoder\nUint8Array Bytes"]
        B --> C{"Payload >= 256 Bytes?"}
        C -- Yes --> D["Brotli Compression\n(Ultra-dense Binary Payload)"]
        C -- No --> E["Raw MessagePack Binary"]
    end

    subgraph NetworkWire["Network Transmission"]
        D --> F["WebSocket Wire Transmission\n(Binary Uint8Array Payload)"]
        E --> F
    end

    subgraph ClientSide["Frontend Decoding"]
        F --> G["Angular RealtimeService\n(onMatchUpdate listener)"]
        G --> H["MessagePack `decode(Uint8Array)`"]
        H --> I["JavaScript Object\n(Renders to Angular Signal)"]
    end
```

---

## 📋 Core Architectural Concepts Summary

1. **Cookie-Based Socket Authentication:** WebSocket upgrade handshake checks HTTP `session` cookie header using `authenticateSocket()` middleware.
2. **Binary Data Format:** Payloads are serialized using `@msgpack/msgpack` (`Uint8Array`) instead of JSON string representations.
3. **Payload Compression:** Messages $\ge$ 256 bytes undergo Brotli compression (`zlib` `brotliCompressSync`) to optimize bandwidth usage.
4. **Redis Pub/Sub Event Broker:** Decouples REST API state changes from WebSocket servers, allowing horizontal scaling across microservices.
5. **Dynamic Room Subscriptions:** Socket clients join dedicated room identifiers (`match:<matchId>`), listening only to relevant real-time update channels.
