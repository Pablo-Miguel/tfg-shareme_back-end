const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    body: {
        type: String,
        required: true,
        trim: true
    },
    question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuestionAnswersMessage',
        required: true
    }
}, {
    timestamps: true
});

answerSchema.methods.toJSON = function() {
    const answer = this;
    const answerObject = answer.toObject();
    const from = answerObject.from;

    delete answerObject.from;

    answerObject.from = {
        id: from._id,
        name: `${from.firstName} ${from.lastName}`,
        avatar: from.avatar
    };

    return answerObject;
}

const Answer = mongoose.model('Answer', answerSchema);

module.exports = Answer;
