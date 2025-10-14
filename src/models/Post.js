import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    title: String,
    content: String,
    author: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    }
});

export default mongoose.model('Post', postSchema);