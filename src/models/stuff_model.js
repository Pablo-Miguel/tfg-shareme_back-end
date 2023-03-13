const mongoose = require('mongoose');

const stuffSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: 'This product has no description'
    },
    image: {
        type: String,
        default: 'https://www.freeiconspng.com/uploads/no-image-icon-6.png'
    },
    price: {
        type: Number,
        required: true,
        trim: true
    },
    has_offer: {
        type: Boolean,
        default: false
    },
    offer_price: {
        type: Number,
        required: function() {
            return this.has_offer;
        },
        trim: true
    },
    shopping_link: {
        type: String,
        required: true,
        trim: true
    },
    views: {
        type: Number,
        required: true,
        trim: true
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    category: {
        type: String,
        enum: ['Music', 'Photography', 'Technology', 'Clothes', 'Kitchen', 'Sports', 'Decoration', 'Books', 'Other'],
        default: 'Other'
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

stuffSchema.methods.toJSON = function () {
    const stuff = this;
    const stuffObject = stuff.toObject();

    delete stuffObject.owner;
    delete stuffObject.likes;

    stuffObject.owner = `${stuffObject.owner.firstname} ${stuffObject.owner.lastname}`;
    stuffObject.likes = stuffObject.likes.length;
    
    return stuffObject;
}

const Stuff = mongoose.model('Stuff', stuffSchema);

module.exports = Stuff;