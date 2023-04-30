const mongoose = require('mongoose');

const ratingMessageSchema = new mongoose.Schema({
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

ratingMessageSchema.methods.toJSON = function() {
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

const ratingMessage = mongoose.model('RatingMessage', ratingMessageSchema);

module.exports = ratingMessage;