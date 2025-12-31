import Fastify from 'fastify';
import cors from '@fastify/cors';
import socketioServer from 'fastify-socket.io';
import { PROJECT_NAME } from '@imposter/shared';
import { Server, Socket } from 'socket.io';
import { GameLogic } from './game';

// Augment Fastify types to include Socket.IO
declare module 'fastify' {
    interface FastifyInstance {
        io: Server;
    }
}

const fastify = Fastify({ logger: true });
const gameLogic = new GameLogic();

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

// REST API: Live stats for admin dashboard
fastify.get('/api/stats/live', async () => {
    return gameLogic.getLiveStats();
});

fastify.ready(err => {
    if (err) throw err;

    fastify.io.on('connection', (socket: Socket) => {
        gameLogic.handleConnection(socket, fastify.io);
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


