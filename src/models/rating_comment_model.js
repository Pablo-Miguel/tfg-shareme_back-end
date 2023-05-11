const mongoose = require('mongoose');

const ratingCommentSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        trim: true,
        validate(value) {
            if (value < 1 || value > 5) {
                throw new Error('Rating must be between 1 and 5');
            }
        }
    },
    comment: {
        type: String,
        required: false,
        trim: true,
        default: ''
    },
    stuff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stuff',
        required: true
    }
}, {
    timestamps: true
});

ratingCommentSchema.methods.toJSON = function() {
    const comment = this;
    const commentObject = comment.toObject();
    const from = commentObject.from;

    delete commentObject.from;

    commentObject.from = {
        id: from._id,
        name: from.name,
        nickName: from.nickName,
        avatar: `${process.env.BACKEND_URL}${from.avatar}`
    };

    return commentObject;
}

const ratingComment = mongoose.model('RatingComment', ratingCommentSchema);

module.exports = ratingComment;