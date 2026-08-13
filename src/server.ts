import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { connectDatabase } from './config/database.js';
import matchRoutes from './modules/matches/match.routes.js';
import { initializeSocketServer, getActiveMatchIds, sendSampleMatchUpdate } from './modules/realtime/socket.service.js';
import {
    connectRedis,
    subscribeToMatchUpdates,
} from './modules/realtime/redis.service.js';
import cookieParser from 'cookie-parser';
import { authRouter } from './modules/auth/auth.routes.js';
import { authenticateSocket } from './modules/auth/socket-auth.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'node:fs';

const swaggerDocument = JSON.parse(
    readFileSync(new URL('./swagger.json', import.meta.url), 'utf-8'),
);

const app = express();

const httpServer = createServer(app);

const PORT = process.env.PORT || 3000;

const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:4200',
        credentials: true,
    },
});

io.use((socket, next) => {
    const session = authenticateSocket(
        socket.handshake.headers,
    );

    if (!session) {
        next(
            new Error('Authentication required'),
        );

        return;
    }

    socket.data.session = session;

    next();
});

app.use(
    cors({
        origin: 'http://localhost:4200',
        credentials: true,
    }),
);

app.use(express.json());

app.use(cookieParser());

app.use('/api', (req, res, next) => {
    // console.log('Cookies received:', req.cookies);
    // console.log('Raw cookie header:', req.headers.cookie);
    next();
});


app.use('/api/auth', authRouter);

app.use('/api/admin', adminRouter);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/api/health', (_req, res) => {
    res.json({
        success: true,
        message: 'Match Realtime API is running',
    });
});

app.use('/api/matches', matchRoutes);

initializeSocketServer(io);

import { seedDefaultUsers } from './modules/auth/auth.service.js';
import { realtimePublisher } from './modules/realtime/realtime.publisher.js';

const startServer = async (): Promise<void> => {
    await connectDatabase();
    await seedDefaultUsers();

    await connectRedis();

    realtimePublisher.initConfigListener();

    await subscribeToMatchUpdates((matchId, binaryData) => {
        io.to(`match:${matchId}`).emit(
            'match:update',
            binaryData,
        );
    });

    httpServer.listen(PORT, () => {
        console.log(
            `API server running on http://localhost:${PORT}`,
        );

        console.log(
            `Socket server running on ws://localhost:${PORT}`,
        );
    });
};

startServer();