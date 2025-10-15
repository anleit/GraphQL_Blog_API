import request from'supertest';
import { app, httpServer, server } from '../graphql/server';
import mongoose from'mongoose';

const graphqlEndpoint = '/graphql';

beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/testdb');
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await server.stop();
});

describe('User Authentication', () => {
    const testUser = {
        username: "testUser",
        email: "test@email.com",
        password: "testPassword"
    };

    it('Should register a new user', async () => {
        const mutation = `
            mutation Register($username: String!, $email: String!, $password: String!) {
                register(username: $username, email: $email, password: $password){
                id
                username
                email
                }
            }
        `;
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .send({ 
            query: mutation,
            variables: testUser,
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.data.register.username).toBe(testUser.username);
        expect(res.body.data.register.email).toBe(testUser.email);
    });

    it('Should not allow to register a new user with an already registered email', async () => {
        const mutation = `
            mutation Register($username: String!, $email: String!, $password: String!) {
                register(username: $username, email: $email, password: $password){
                id
                username
                email
                }
            }
        `;
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .send({ 
            query: mutation,
            variables: {
                username: "testUserB",
                email: testUser.email,
                password: "testPasswordB",
            },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message.toLowerCase()).toBe("user already exists");
    });

    it('Should login successfully', async () => {
        const mutation = `
            mutation Login($email: String!, $password: String!) {
                login(email: $email, password: $password){
                    token
                    user {
                        id
                        username
                    }
                }
            }
        `;
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .send({
            query: mutation,
            variables: {
                email: testUser.email,
                password: testUser.password,
            },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.data.login.token).toBeDefined();
        expect(res.body.data.login.user.username).toBe(testUser.username);
    });

    it('Should not allow to login with a wrong password', async () => {
        const mutation = `
            mutation Login($email: String!, $password: String!) {
                login(email: $email, password: $password){
                    token
                    user {
                        id
                        username
                    }
                }
            }
        `;
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .send({
            query: mutation,
            variables: {
                email: testUser.email,
                password: "wrongPassword",
            },
        });
        console.log('Response: ', res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message.toLowerCase()).toBe("invalid credentials");
    });

    it('Should not allow to login with an unregistered user', async () => {
        const mutation = `
            mutation Login($email: String!, $password: String!) {
                login(email: $email, password: $password){
                    token
                    user {
                        id
                        username
                    }
                }
            }
        `;
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .send({
            query: mutation,
            variables: {
                email: "unregisteredUser",
                password: "Password",
            },
        });
        console.log('Response: ', res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message.toLowerCase()).toBe("invalid credentials");
    });
});