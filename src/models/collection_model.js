const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: 'This collection has no description'
    },
    stuffs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stuff'
    }],
    views: {
        type: Number,
        required: true,
        trim: true
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

collectionSchema.methods.toJSON = function() {
    const collection = this;
    const collectionObject = collection.toObject();
    const owner = collectionObject.owner;

    delete collectionObject.owner;
    delete collectionObject.likes;

    collectionObject.owner = {
        _id: owner._id,
        name: `${owner.firstName} ${owner.lastName}`,
        avatar: owner.avatar
    };
    
    collectionObject.likes = collectionObject.likes.length;

    return collectionObject;
}

const Collection = mongoose.model('Collection', collectionSchema);

module.exports = Collection;