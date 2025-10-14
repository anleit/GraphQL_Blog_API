import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Post from '../models/Post.js';
import Comment from "../models/Comment.js";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

export default {
    Query: {
        me: (_, __, { user }) => user,
        posts: () => Post.find().populate('author'),
        post: (_, { id }) => Post.findById(id).populate(['author', 'comments']),
    },
    Mutation: {
        register: async (_, { username, email, password }) => {
            const hashed = await bcrypt.hash(password, 10);
            const user = await User.create({ username, email, password: hashed });
            return jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        },
        login: async (_, { email, password }) => {
            const user = await User.findOne({ email });
            if (!user) throw new Error('Invalid credentials');
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) throw new Error('Invalid credentials');
            return jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        },
        createPost: async (_, { title, content }, { user }) => {
            if (!user) throw new Error('Not authenticated');
            const post = await Post.create({ title, content, author: user.id });
            return post.populate('author');
        },
        addComment: async (_, { postId, content }, { user }) => {
            if (!user) throw new Error('Not authenticated');
            const comment = await Comment.create({ content, author: user.id, post: postId });
            return comment.populate(['author', 'post']);
        }
    }
};