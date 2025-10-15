import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Post from '../models/Post.js';
import Comment from "../models/Comment.js";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

export default {
    Query: {
        me: async (_, __, { user }) => {
            if (!user) throw new Error('Not authenticated');
            return await User.findById(user.id);
        },

        posts: async (_, __, { user }) => {
            if (user) {
                return await Post.find({
                    $or: [
                        { isPublic: true }, 
                        { author: user.id }
                    ]
                }).populate('author');
            }
            return await Post.find({ isPublic: true }).populate('author');
        },

        post: async (_, { id }, { user }) => {
            const post = await Post.findById(id).populate(['author', 'comments']);
            if (!post) throw new Error('Post not found');
            if (!post.isPublic && (!user || String(post.author._id) !== String(user.id))) {
                throw new Error('Access denied');
            }
            return post;
        },
    },
    Mutation: {
        register: async (_, { username, email, password }) => {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                throw new Error('User already exists');
            }
            const hashed = await bcrypt.hash(password, 10);
            const user = await User.create({ username, email, password: hashed });
            return user;
        },

        login: async (_, { email, password }) => {
            const user = await User.findOne({ email });
            if (!user) throw new Error('Invalid credentials');
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) throw new Error('Invalid credentials');
            return { token: jwt.sign({ id: user.id }, process.env.JWT_SECRET), user: user };
        },

        createPost: async (_, { input }, { user }) => {
            if (!user) throw new Error('Not authenticated');
            const post = await Post.create({ 
                title: input.title,
                content: input.content,
                isPublic: input.isPublic ?? true,
                author: user.id,
             });
            await post.save();
            return post.populate('author');
        },

        updatePost: async (_, { id, input }, { user }) => {
            if (!user) throw new Error('Not authenticated');
            const post = await Post.findById(id);
            if (!post) throw new Error('Post not found');
            if ( String(post.author) !== String(user.id)) throw new Error('Unauthorized');
            Object.assign(post, input);
            await post.save();
            return await post.populate('author');
        },

        deletePost: async (_, { id }, { user }) => {
            if (!user) throw new Error('Not authenticated');
            const post = await Post.findById(id);
            if (!post) throw new Error('Post not found');
            if (String(post.author) !== String(user.id)) throw new Error('Unauthorized');
            await post.deleteOne();
            return true;
        },

        addComment: async (_, { postId, content }, { user }) => {
            if (!user) throw new Error('Not authenticated');
            const post = await Post.findById(postId);
            if (!post) throw new Error('Post not found');
            const comment = await Comment.create({ content, author: user.id, post: postId });
            return comment.populate(['author', 'post']);
        }
    }
};