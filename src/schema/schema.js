const typeDefs = `#graphql
    type User {
        id: ID!
        username: String!
        email: String!
        posts: [Post!]
    }
    type Post {
        is: ID!
        title: String!
        content: String!
        author: User!
        comments: [Comment!]
    } 
    type Comment {
        id: ID!
        content: String!
        author: User!
        post: Post!
    }
    type Query {
        me: User
        posts: [Post!]
        post(id: ID!): Post
    }
    type Mutation {
        register(username: String!, email: String!, password: String!): String
        login(email: String!, password: String!): String
        createPost(title: String!, content: String!): Post
        addComment(postId: ID!, content: String!): Comment
    }
`;

export default typeDefs;