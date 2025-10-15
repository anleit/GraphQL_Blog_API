import request from 'supertest';
import { httpServer, server } from '../graphql/server';
import mongoose from 'mongoose';
import User from '../models/User';
import Post from '../models/Post';

const graphqlEndpoint = '/graphql';

const testUserA = {
        username: "testUserA",
        email: "testA@email.com",
        password: "testPasswordA"
};
const testUserB = {
        username: "testUserB",
        email: "testB@email.com",
        password: "testPasswordB"
};

beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/testdb');
    
    await User.deleteMany({});
    await Post.deleteMany({});
    
    const mutationResgister = `
            mutation Register($username: String!, $email: String!, $password: String!) {
                register(username: $username, email: $email, password: $password){
                id
                username
                email
                }
            }
    `;
    await request(httpServer).post(graphqlEndpoint).send({ query: mutationResgister, variables: testUserA, });
    await request(httpServer).post(graphqlEndpoint).send({ query: mutationResgister, variables: testUserB, });    
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await server.stop();
});

describe('GraphQL Posts', () => {
    let tokenA, tokenB;

    beforeEach(async () => {
        const mutationLogin = `
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
        const resA = await request(httpServer).post(graphqlEndpoint).send({ query: mutationLogin, variables: { email: testUserA.email, password: testUserA.password }});
        const resB = await request(httpServer).post(graphqlEndpoint).send({ query: mutationLogin, variables: { email: testUserB.email, password: testUserB.password }});

        tokenA = resA.body.data.login.token;
        userA = resA.body.data.login.user;
        tokenB = resB.body.data.login.token;
        userB = resB.body.data.login.user;
    });

    it('Should create a public post', async () => {
        const mutation = `
            mutation CreatePost($input: PostInput!) {
                createPost(input: $input) {
                    title
                    content
                    isPublic
                    author {
                        id
                        username
                        email
                    }
                }
            }
        `;
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ 
            query: mutation,
            variables: {
                input: {
                    title: "Title for Post 1",
                    content: "Content for Post 1",
                },
            },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.data.createPost.title).toBe("Title for Post 1");
        expect(res.body.data.createPost.content).toBe("Content for Post 1");
        expect(res.body.data.createPost.isPublic).toBe(true);
        expect(res.body.data.createPost.author.id).toBe(userA.id);
    });

    it('Should create a private post', async () => {
        const mutation = `
            mutation CreatePost($input: PostInput!) {
                createPost(input: $input) {
                    title
                    content
                    isPublic
                    author {
                        id
                        username
                        email
                    }
                }
            }
        `;
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ 
            query: mutation,
            variables: {
                input: {
                    title: "Title for private Post 1",
                    content: "Content for private Post 1",
                    isPublic: false
                },
            },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.data.createPost.title).toBe("Title for private Post 1");
        expect(res.body.data.createPost.content).toBe("Content for private Post 1");
        expect(res.body.data.createPost.isPublic).toBe(false);
        expect(res.body.data.createPost.author.id).toBe(userA.id);
    });

    it('Should not allow unauthenticated users to create a post', async () => {
        const mutation = `
            mutation CreatePost($input: PostInput!) {
                createPost(input: $input) {
                    title
                    content
                    isPublic
                    author {
                        id
                        username
                        email
                    }
                }
            }
        `;
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .send({ 
            query: mutation,
            variables: {
                input: {
                    title: "Title for unauthenticated Post",
                    content: "Content for unauthenticated Post",
                    isPublic: true
                },
            },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message.toLowerCase()).toBe("not authenticated")
    });

    it('Should update a post', async () => {
        const mutationCreate = `
            mutation CreatePost($input: PostInput!) {
                createPost(input: $input) {
                    id
                }
            }
        `;
        const resCreate = await request(httpServer)
        .post(graphqlEndpoint)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ 
            query: mutationCreate,
            variables: {
                input: {
                    title: "Original title",
                    content: "Orignal content",
                    isPublic: true
                },
            },
        });
        let id = resCreate.body.data.createPost.id;
        const mutation = `
            mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
                updatePost(id: $id, input: $input) {
                    title
                    content
                    isPublic
                }
            }
        `;
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ 
            query: mutation,
            variables: {
                id: id,
                input: {
                    title: "Updated title",
                    content: "Updated content",
                    isPublic: false
                },
            },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.data.updatePost.title).toBe("Updated title");
        expect(res.body.data.updatePost.content).toBe("Updated content");
        expect(res.body.data.updatePost.isPublic).toBe(false);
    });

    it('Should not allow unauthenticated users to update a post', async () =>{
        const mutationCreate = `
            mutation CreatePost($input: PostInput!) {
                createPost(input: $input) {
                    id
                }
            }
        `;
        const resCreate = await request(httpServer)
        .post(graphqlEndpoint)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ 
            query: mutationCreate,
            variables: {
                input: {
                    title: "Original title",
                    content: "Orignal content",
                    isPublic: true
                },
            },
        });
        let id = resCreate.body.data.createPost.id;
        const mutation = `
            mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
                updatePost(id: $id, input: $input) {
                    title
                    content
                    isPublic
                }
            }
        `;
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .send({ 
            query: mutation,
            variables: {
                id: id,
                input: {
                    title: "Updated title",
                    content: "Updated content",
                    isPublic: false
                },
            },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message.toLowerCase()).toBe("not authenticated");
    });

    it('Should not allow to update a non existing post', async () => {
        let id = new mongoose.Types.ObjectId();
        const mutation = `
            mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
                updatePost(id: $id, input: $input) {
                    title
                    content
                    isPublic
                }
            }
        `;
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ 
            query: mutation,
            variables: {
                id: id,
                input: {
                    title: "Updated title",
                    content: "Updated content",
                    isPublic: false
                },
            },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message.toLowerCase()).toBe("post not found");
    });

    it("Should not allow an user to update another user's post", async () => {
        const mutationCreate = `
            mutation CreatePost($input: PostInput!) {
                createPost(input: $input) {
                    id
                }
            }
        `;
        const resCreate = await request(httpServer)
        .post(graphqlEndpoint)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ 
            query: mutationCreate,
            variables: {
                input: {
                    title: "Original title",
                    content: "Orignal content",
                    isPublic: true
                },
            },
        });
        let id = resCreate.body.data.createPost.id;
        const mutation = `
            mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
                updatePost(id: $id, input: $input) {
                    title
                    content
                    isPublic
                }
            }
        `;
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ 
            query: mutation,
            variables: {
                id: id,
                input: {
                    title: "Updated title",
                    content: "Updated content",
                    isPublic: false
                },
            },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message.toLowerCase()).toBe('unauthorized')
    });

    it('Should delete a post', async () => {
        const mutationCreate = `
            mutation CreatePost($input: PostInput!) {
                createPost(input: $input) {
                    id
                }
            }
        `;
        const resCreate = await request(httpServer)
        .post(graphqlEndpoint)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ 
            query: mutationCreate,
            variables: {
                input: {
                    title: "Title to delete",
                    content: "Content to delete",
                    isPublic: true
                },
            },
        });
        let id = resCreate.body.data.createPost.id;
        const mutation = `
            mutation deletePost($id: ID!) {
                deletePost(id: $id)
            }
        `;
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ 
            query: mutation,
            variables: {
                id: id,
            },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.data.deletePost).toBe(true);
    });

    it('Should not allow unauthenticated users to delete a post', async () =>{
        const mutationCreate = `
            mutation CreatePost($input: PostInput!) {
                createPost(input: $input) {
                    id
                }
            }
        `;
        const resCreate = await request(httpServer)
        .post(graphqlEndpoint)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ 
            query: mutationCreate,
            variables: {
                input: {
                    title: "Title should not be deleted 2",
                    content: "Content should not be deleted",
                    isPublic: false
                },
            },
        });
        let id = resCreate.body.data.createPost.id;
        const mutation = `
            mutation deletePost($id: ID!) {
                deletePost(id: $id)
            }
        `;
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .send({ 
            query: mutation,
            variables: {
                id: id,
            },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message.toLowerCase()).toBe("not authenticated");
    });

    it('Should not allow to delete a non existing post', async () => {
        let id = new mongoose.Types.ObjectId();
        const mutation = `
            mutation deletePost($id: ID!) {
                deletePost(id: $id)
            }
        `;
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ 
            query: mutation,
            variables: {
                id: id,
            },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message.toLowerCase()).toBe("post not found");
    });

    it("Should not allow an user to delete another user's post", async () => {
        const mutationCreate = `
            mutation CreatePost($input: PostInput!) {
                createPost(input: $input) {
                    id
                }
            }
        `;
        const resCreate = await request(httpServer)
        .post(graphqlEndpoint)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ 
            query: mutationCreate,
            variables: {
                input: {
                    title: "Post from UserA",
                    content: "Content",
                    isPublic: true
                },
            },
        });
        let id = resCreate.body.data.createPost.id;
        const mutation = `
            mutation deletePost($id: ID!) {
                deletePost(id: $id)
            }
        `;
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ 
            query: mutation,
            variables: {
                id: id,
            },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message.toLowerCase()).toBe('unauthorized')
    });

    it('Should return all public posts', async () =>{
        const query = `
            query {
                posts {
                    id
                    title
                    isPublic
                }
            }
        `;
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .send({ query });
        console.log(res.body.data.posts);
        expect(res.statusCode).toBe(200);
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.posts).toBeInstanceOf(Array);
    });

    it("Should return all posts plus all of user's privated ones", async () => {
        const query = `
            query {
                posts {
                    id
                    title
                    isPublic
                    author {
                        id
                        username
                    }
                }
            }
        `;
        const res = await request(httpServer)
        .post(graphqlEndpoint)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ query });
        console.log(res.body.data.posts);
        expect(res.statusCode).toBe(200);
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data.posts).toBeInstanceOf(Array);
    });

    
});