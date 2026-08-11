import type { IncomingHttpHeaders } from 'node:http';

import { getSession } from './auth.service.js';

const getCookieValue = (
    headers: IncomingHttpHeaders,
    cookieName: string,
): string | null => {
    const cookieHeader = headers.cookie;

    if (!cookieHeader) {
        return null;
    }

    const cookies = cookieHeader.split(';');

    for (const cookie of cookies) {
        const [name, ...valueParts] = cookie.trim().split('=');

        if (name === cookieName) {
            return decodeURIComponent(valueParts.join('='));
        }
    }

    return null;
};

export const authenticateSocket = (
    headers: IncomingHttpHeaders,
) => {
    const sessionId = getCookieValue(
        headers,
        'session',
    );

    if (!sessionId) {
        return null;
    }

    return getSession(sessionId);
};