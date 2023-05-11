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
        default: 'assets/Universal-0/imgs/no-image-icon.png'
    },
    price: {
        type: Number,
        default: 0,
        validate(value) {
            if (value < 0) {
                throw new Error('Price must be a positive number');
            }
        }
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
        trim: true,
        default: 0,
        validate(value) {
            if (value < 0) {
                throw new Error('Offer price must be a positive number');
            }
        }
    },
    shopping_link: {
        type: String,
        required: true,
        trim: true
    },
    views: {
        type: Number,
        default: 0,
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

stuffSchema.virtual('ratingComments', {
    ref: 'RatingComment',
    localField: '_id',
    foreignField: 'stuff'
});

stuffSchema.virtual('questionAnswersComments', {
    ref: 'QuestionAnswersComment',
    localField: '_id',
    foreignField: 'stuff'
});

stuffSchema.methods.toJSON = function () {
    const stuff = this;
    const stuffObject = stuff.toObject();
    const owner = stuffObject.owner;
    const likes = stuffObject.likes;

    delete stuffObject.owner;
    delete stuffObject.likes;

    stuffObject.image = `${process.env.BACKEND_URL}${stuffObject.image}`;

    stuffObject.owner = {
        _id: owner._id,
        name: owner.name,
        nickName: owner.nickName,
        avatar: `${process.env.BACKEND_URL}${owner.avatar}`
    };
    stuffObject.likes = likes.length;
    
    return stuffObject;
}

const Stuff = mongoose.model('Stuff', stuffSchema);

module.exports = Stuff;