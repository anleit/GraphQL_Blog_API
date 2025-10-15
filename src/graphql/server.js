import express from 'express';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@as-integrations/express5';
import http from 'http';
import cors from 'cors';
import typeDefs from './typeDefs.js';
import resolvers from './resolvers.js';
import { getUserFromToken } from '../middleware/auth.js';

const app = express();
const httpServer = http.createServer(app);

const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

await server.start();

app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, {
        context: async ({ req }) => { 
            const token = req.headers.authorization?.split(' ')[1];
            const user = token ? await getUserFromToken(token) : null;
            return { user };
         },
    }),
);

export { app, httpServer, server };