const mongoose = require('mongoose');

const questionAnswersCommentSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    question: {
        type: String,
        required: true,
        trim: true
    },
    stuff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stuff',
        required: true
    }
}, {
    timestamps: true
});

questionAnswersCommentSchema.virtual('answers', {
    ref: 'Answer',
    localField: '_id',
    foreignField: 'question'
});

questionAnswersCommentSchema.methods.toJSON = function() {
    const comment = this;
    const commentObject = comment.toObject();
    const from = commentObject.from;

    delete commentObject.from;

    commentObject.from = {
        id: from._id,
        name: `${from.firstName} ${from.lastName}`,
        avatar: from.avatar
    };

    return commentObject;
}

const questionAnswersComment = mongoose.model('QuestionAnswersComment', questionAnswersCommentSchema);

module.exports = questionAnswersComment;