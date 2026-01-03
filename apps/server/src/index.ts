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

// Enable CORS for admin dashboard
fastify.register(cors, {
    origin: true, // Allow all origins in dev
    methods: ['GET', 'POST']
});

fastify.register(socketioServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
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
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
        console.log(`${PROJECT_NAME} Server running at http://localhost:3000`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();


