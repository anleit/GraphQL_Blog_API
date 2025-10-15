import request from 'supertest';
import { httpServer, server } from '../graphql/server';
import mongoose from 'mongoose';
import User from '../models/User';
import Post from '../models/Post';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const graphqlEndpoint = '/graphql';

let testUser;
let token;
let post, privatePost;


beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/testdb');
    
    await User.deleteMany({});
    await Post.deleteMany({});
    
    testUser = await User.create({
        username: "testUser",
        email: "test@email.com",
        password: "testPassword"
    });

    token = jwt.sign({ id: testUser._id, username: testUser.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

    post = await Post.create({
        title: "Test Post",
        content: "Test content",
        isPublic: true,
        author: testUser._id
    });

    privatePost = await Post.create({
        title: 'Privado',
        content: 'Solo mío',
        isPublic: false,
        author: testUser._id
    });
});

afterAll(async () => {
    await User.deleteMany({});
    await Post.deleteMany({});  
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await server.stop();
});

describe('GraphQL Comments', () => {

    it('Should allow an authenticated user to comment on a public post', async () => {
        const mutation = `
            mutation AddComment($postId: ID!, $content: String!) {
                addComment(postId: $postId, content: $content) {
                    id
                    content
                    author {
                        username
                    }
                    post {
                        title
                    }
                }
            }
        `;
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .set('Authorization', `Bearer ${token}`)
        .send({
            query: mutation,
            variables: { 
                postId: post._id.toString(), 
                content: 'Test Comment' 
            }
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.data.addComment.content).toBe('Test Comment');
        expect(res.body.data.addComment.author.username).toBe('testUser');
        expect(res.body.data.addComment.post.title).toBe('Test Post');     
    });

    it('Should not allow commenting on a private post', async () => {
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .set('Authorization', `Bearer ${token}`)
        .send({
            query: `
                mutation AddComment($postId: ID!, $content: String!) {
                    addComment(postId: $postId, content: $content) {
                        id
                    }
                }
            `,
            variables: { postId: privatePost._id.toString(), content: "Cannot comment on privated posts" }
        });

        expect(res.body.errors[0].message).toMatch(/Action denied/i);
    });

    it('Should not allow commenting when unauthenticated', async () => {
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .send({
            query: `
                mutation AddComment($postId: ID!, $content: String!) {
                    addComment(postId: $postId, content: $content) {
                        id
                    }
                }
                `,
            variables: { postId: post._id.toString(), content: "Unauthenticated comment" }
        });

        expect(res.body.errors[0].message).toMatch(/Not authenticated/i);
    });

    it('Should not allow to comment on a post that does not exist', async () => {
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .set('Authorization', `Bearer ${token}`)
        .send({
            query: `
                mutation AddComment($postId: ID!, $content: String!) {
                    addComment(postId: $postId, content: $content) {
                        id
                    }
                }
                `,
            variables: { postId: new mongoose.Types.ObjectId(), content: "New Comment" }
        });
        expect(res.body.errors[0].message.toLowerCase()).toMatch("post not found");
    });

});