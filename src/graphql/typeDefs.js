const typeDefs = `#graphql
    type User {
        id: ID!
        username: String!
        email: String!
        posts: [Post!]
        createdAt: String
    }
    type Post {
        id: ID!
        title: String!
        content: String!
        isPublic: Boolean!
        author: User!
        comments: [Comment!]
        createdAt: String
    } 
    type Comment {
        id: ID!
        content: String!
        author: User!
        post: Post!
        createdAt: String
    }
    type Login {
        token: String!
        user: User!
    }
    input PostInput {
        title: String!
        content: String!
        isPublic: Boolean
    }
    input UpdatePostInput {
        title: String
        content: String
        isPublic: Boolean
    }
    type Query {
        me: User
        posts: [Post!]
        post(id: ID!): Post
    }
    type Mutation {
        register(username: String!, email: String!, password: String!): User!
        login(email: String!, password: String!): Login!
        createPost(input: PostInput!): Post!
        updatePost(id: ID!, input: UpdatePostInput!): Post!
        deletePost(id: ID!): Boolean!
        addComment(postId: ID!, content: String!): Comment
    }
`;

export default typeDefs;