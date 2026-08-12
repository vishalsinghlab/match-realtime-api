import { createClient, type RedisClientType } from 'redis';
import { encodeMessage } from './binary.js';
import { compress, decompress } from './compression.js';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

const publisher: RedisClientType = createClient({
    url: REDIS_URL,
});

const subscriber: RedisClientType = createClient({
    url: REDIS_URL,
});

publisher.on('error', (error) => {
    console.error('Redis publisher error:', error);
});

subscriber.on('error', (error) => {
    console.error('Redis subscriber error:', error);
});

export const connectRedis = async (): Promise<void> => {
    await publisher.connect();
    await subscriber.connect();

    console.log('Redis connected');
};

export interface RedisSessionData {
    id: string;
    userId: string;
    role: 'ADMIN' | 'USER';
    expiresAt: number;
}

export const saveSessionInRedis = async (session: RedisSessionData, ttlSeconds: number = 3600): Promise<void> => {
    const key = `session:${session.id}`;
    await publisher.set(key, JSON.stringify(session), { EX: ttlSeconds });
};

export const getSessionFromRedis = async (sessionId: string): Promise<RedisSessionData | null> => {
    const key = `session:${sessionId}`;
    const data = await publisher.get(key);
    if (!data) return null;
    try {
        return JSON.parse(data) as RedisSessionData;
    } catch {
        return null;
    }
};

export const deleteSessionFromRedis = async (sessionId: string): Promise<void> => {
    const key = `session:${sessionId}`;
    await publisher.del(key);
};

export const publishConfigUpdated = async (matchId: string, settings: unknown): Promise<void> => {
    await publisher.publish(
        'config:updated',
        JSON.stringify({ matchId, settings, timestamp: Date.now() })
    );
};

export const subscribeToConfigUpdates = async (
    callback: (matchId: string, settings: unknown) => void
): Promise<void> => {
    await subscriber.subscribe('config:updated', (message) => {
        try {
            const data = JSON.parse(message);
            callback(data.matchId, data.settings);
        } catch (error) {
            console.error('Failed to parse config:updated message:', error);
        }
    });
};

export const publishMatchUpdate = async (
    matchId: string,
    data: unknown,
): Promise<void> => {
    const channel = `match:${matchId}`;

    const encoded = encodeMessage(data);

    let payload = Buffer.from(encoded);
    let compressed = false;

    // Don't compress tiny messages.
    if (payload.length >= 256) {
        payload = Buffer.from(compress(payload));
        compressed = true;
    }

    const message = {
        compressed,
        payload: payload.toString('base64'),
    };

    await publisher.publish(
        channel,
        JSON.stringify(message),
    );
};

export const subscribeToMatchUpdates = async (
    callback: (
        matchId: string,
        data: Uint8Array,
    ) => void,
): Promise<void> => {
    await subscriber.pSubscribe(
        'match:*',
        (message, channel) => {
            const matchId = channel.replace('match:', '');

            try {
                const envelope = JSON.parse(message) as {
                    compressed: boolean;
                    payload: string;
                };

                let binaryData = Buffer.from(
                    envelope.payload,
                    'base64',
                );

                if (envelope.compressed) {
                    binaryData = Buffer.from(decompress(binaryData));
                }

                callback(matchId, binaryData);
            } catch (error) {
                console.error(
                    `Invalid Redis realtime message on ${channel}:`,
                    error,
                );
            }
        },
    );
};