import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

export const getUserFromToken = async (token) => {
    try {
        if (!token) return null;
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        return await User.findById(decoded.id);
    } catch (err) {
        return null;
    }
};