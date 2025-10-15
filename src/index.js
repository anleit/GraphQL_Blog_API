import { httpServer } from './graphql/server.js';
import connectDB from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();
connectDB();

await new Promise((resolve) => httpServer.listen({ port: process.env.PORT }, resolve));
console.log(`Server ready at http://localhost:4000/graphql`);