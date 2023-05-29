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
    stuff: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Stuff'
        }],
        validate: {
            validator: function (stuff) {
                return stuff.length >= 1;
            },
            message: 'At least one stuff item is required'
        }
    },
    views: {
        type: Number,
        default: 0
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
    const likes = collectionObject.likes;
    
    delete collectionObject.owner;
    delete collectionObject.likes;

    collectionObject.owner = {
        _id: owner._id,
        name: owner.name,
        nickName: owner.nickName,
        avatar: `${process.env.BACKEND_URL}${owner.avatar}`
    };
    
    collectionObject.likes = likes.length;

    return collectionObject;
}

const Collection = mongoose.model('Collection', collectionSchema);

module.exports = Collection;