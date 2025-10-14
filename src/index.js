import express from 'express';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@as-integrations/express5';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import typeDefs from './schema/schema.js';
import resolvers from './schema/resolvers.js';
import { getUserFromToken } from './middleware/auth.js';

dotenv.config();
connectDB();

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

await new Promise((resolve) => httpServer.listen({ port: 4000 }, resolve));
console.log(`Server ready at http://localhost:4000/graphql`);