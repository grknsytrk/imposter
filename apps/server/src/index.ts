import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import socketioServer from 'fastify-socket.io';
import { PROJECT_NAME } from '@imposter/shared';
import { Server, Socket } from 'socket.io';
import { GameLogic } from './game';
import { authMiddleware, AuthenticatedSocket } from './middleware/auth';
import { startRateLimitCleanup } from './middleware/rate-limit';

// Augment Fastify types to include Socket.IO
declare module 'fastify' {
    interface FastifyInstance {
        io: Server;
    }
}

const fastify = Fastify({ logger: true });
const gameLogic = new GameLogic();

// Start rate limit cleanup (every 5 minutes)
startRateLimitCleanup(300_000);

const isProd = process.env.NODE_ENV === 'production';
const clientUrl = process.env.CLIENT_URL;

// Enable CORS (restrict to CLIENT_URL in production)
fastify.register(cors, {
    origin: (origin, cb) => {
        // Same-origin / server-to-server / curl requests may have no origin
        if (!origin) return cb(null, true);

        // Dev: allow all origins for convenience
        if (!isProd) return cb(null, true);

        // Prod: only allow the configured frontend origin
        if (clientUrl && origin === clientUrl) return cb(null, true);

        return cb(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST']
});

fastify.register(socketioServer, {
    cors: {
        origin: isProd && clientUrl ? clientUrl : "*",
        methods: ["GET", "POST"]
    }
});

// Basic health endpoint (useful for HF Spaces and quick checks)
fastify.get('/', async () => {
    return { ok: true, service: PROJECT_NAME };
});

// REST API: Live stats for admin dashboard (protected)
fastify.get('/api/stats/live', async (request, reply) => {
    const apiKey = request.headers['x-api-key'];
    const expectedKey = process.env.ADMIN_API_KEY;

    // If ADMIN_API_KEY is set, require it; otherwise allow in dev mode
    if (expectedKey && apiKey !== expectedKey) {
        return reply.status(401).send({ error: 'Unauthorized' });
    }

    return gameLogic.getLiveStats();
});

fastify.ready(err => {
    if (err) throw err;

    // Auth middleware - verifies JWT and binds userId immutably
    fastify.io.use(authMiddleware);

    fastify.io.on('connection', (socket: Socket) => {
        gameLogic.handleConnection(socket as AuthenticatedSocket, fastify.io);
    });
});

const start = async () => {
    try {
        const port = Number(process.env.PORT) || 7860;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`${PROJECT_NAME} Server running at http://0.0.0.0:${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();


