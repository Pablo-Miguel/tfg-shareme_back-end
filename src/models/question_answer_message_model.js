const mongoose = require('mongoose');

const questionAnswersMessageSchema = new mongoose.Schema({
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

questionAnswersMessageSchema.virtual('answers', {
    ref: 'Answer',
    localField: '_id',
    foreignField: 'question'
});

questionAnswersMessageSchema.methods.toJSON = function() {
    const message = this;
    const messageObject = message.toObject();
    const from = messageObject.from;

    delete messageObject.from;

    messageObject.from = {
        id: from._id,
        name: `${from.firstName} ${from.lastName}`,
        avatar: from.avatar
    };

    return messageObject;
}

const questionAnswersMessage = mongoose.model('QuestionAnswersMessage', questionAnswersMessageSchema);

module.exports = questionAnswersMessage;