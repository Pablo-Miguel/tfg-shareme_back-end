const mongoose = require('mongoose');
const Answer = require('./answer_model');

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
        name: from.name,
        nickName: from.nickName,
        avatar: `${process.env.BACKEND_URL}${from.avatar}`
    };

    return commentObject;
};

questionAnswersCommentSchema.pre('remove', async function(next) {
    const questionAnswersComment = this;
    await Answer.deleteMany({ question: questionAnswersComment._id });
    next();
}); 

const questionAnswersComment = mongoose.model('QuestionAnswersComment', questionAnswersCommentSchema);

module.exports = questionAnswersComment;