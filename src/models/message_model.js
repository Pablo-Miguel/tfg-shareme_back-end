const mongoose = require('mongoose');
const validator = require('validator');

const messageSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    body: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        validate(value) {
            if (!validator.matches(value, '(?=.{1,})')) {
                throw new Error('Message is invalid, must be min one character');
            }
        }
    },
    stuff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stuff',
        required: true
    }
}, {
    timestamps: true
});

messageSchema.methods.toJSON = function() {
    const message = this;
    const messageObject = message.toObject();

    delete messageObject.from;
    delete messageObject.stuff;

    messageObject.from = `${messageObject.from.firstname} ${messageObject.from.lastname}`;
    messageObject.stuff = messageObject.stuff.title;

    return messageObject;
}

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;