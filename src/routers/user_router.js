const express = require('express');
const User = require('../models/user_model');
const auth = require('../middleware/auth');
const fs = require('fs');
const mime = require('mime-types');
// const sharp = require('sharp');
const { upload } = require('../../controllers/upload');
const router = new express.Router();

router.post('/users/signup', async (req, res) => {
    const user = new User(req.body);
    
    try {
        await user.save();
        const token = await user.generateAuthToken();

        res.status(201).send({ user, token });
    } catch (e) {
        res.status(400).send(e);
    }
});

router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password);
        const token = await user.generateAuthToken();
        
        res.send({ user, token });
    } catch (e) {
        res.status(400).send(e);
    }
});

router.get('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token;
        });

        await req.user.save();

        res.send();
    } catch (e) {
        res.status(500).send();
    }
});

router.get('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = [];

        await req.user.save();

        res.send();
    } catch (e) {
        res.status(500).send();
    }
});

router.get('/users/me', auth, async (req, res) => {
    res.send(req.user);
});

router.patch('/users/me', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['firstName', 'lastName', 'nickName', 'verified', 'email', 'password'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' });
    }

    try {
        updates.forEach((update) => req.user[update] = req.body[update]);
        await req.user.save();

        res.send(req.user);
    } catch (e) {
        res.status(400).send(e);
    }
});

// router.delete('/users/me', auth, async (req, res) => {
//     try {
//         await User.findByIdAndDelete(req.user._id);
        
//         res.send(req.user);
//     } catch (e) {
//         res.status(500).send();
//     }
// });

router.get('/users/:id', auth, async (req, res) => {
    const _id = req.params.id;

    try {
        const user = await User.findById(_id);

        if (!user) {
            return res.status(404).send();
        }

        res.send({
            ...user.toJSON(),
            isFollowing: !req.user._id.equals(_id) ? req.user.following.includes(_id) : true
        });

    } catch (e) {
        res.status(500).send();
    }
});

router.get('/users/:id/follow', auth, async (req, res) => {
    const _id = req.params.id;

    try {
        const followedUser = await User.findById(_id);

        if(!req.user._id.equals(_id)) {
            req.user.following.push(_id);
            await req.user.save();

            followedUser.followers.push(req.user._id);
            await followedUser.save();
        }

        res.send({
            ...followedUser.toJSON(),
            isFollowing: !req.user._id.equals(_id) ? req.user.following.includes(_id) : true
        });

    } catch (e) {
        res.status(500).send();
    }
});

router.get('/users/:id/unfollow', auth, async (req, res) => {
    const _id = req.params.id;

    try {
        const followedUser = await User.findById(_id);

        if(!req.user._id.equals(_id)) {
            req.user.following = req.user.following.filter((id) => {
                return !id.equals(_id);
            });
            await req.user.save();
        
            followedUser.followers = followedUser.followers.filter((id) => {
                return !id.equals(req.user._id);
            });
            await followedUser.save();

        }

        res.send({
            ...followedUser.toJSON(),
            isFollowing: !req.user._id.equals(_id) ? req.user.following.includes(_id) : true
        });

    } catch (e) {
        res.status(500).send();
    }
});

router.get('/users/:id/followers', auth, async (req, res) => {
    const _id = req.params.id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;

    try {

        const user = await User.findById(_id).populate('followers');
        
        if (!user) {
            return res.status(404).send();
        }

        const page = Math.floor(skip / limit);
        
        const followers = user.followers.reverse().slice(page * limit, (page * limit) + limit).map((follower) => {
            return {
                ...follower.toJSON(),
                isFollowing: !req.user._id.equals(follower._id) ? req.user.following.includes(follower._id) : true
            };
        });

        res.send({ followers: followers, total: user.followers.length });
        
    } catch (e) {
        res.status(500).send();
    }
});

router.get('/users/:id/following', auth, async (req, res) => {
    const _id = req.params.id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;

    try {

        const user = await User.findById(_id).populate('following');

        if (!user) {
            return res.status(404).send();
        }

        const page = Math.floor(skip / limit);

        const following = user.following.reverse().slice(page * limit, (page * limit) + limit).map((followedUser) => {
            return {
                ...followedUser.toJSON(),
                isFollowing: !req.user._id.equals(followedUser._id) ? req.user.following.includes(followedUser._id) : true
            };
        });

        res.send({ following: following, total: user.following.length });

    } catch (e) {
        res.status(500).send();
    }
});

router.get('/users', auth, async (req, res) => {
    const match = {};
    const sort = {};

    if (req.query.profileNameOrNickName && req.query.profileNameOrNickName !== '') {
        const regex = new RegExp(req.query.profileNameOrNickName, 'i');
        match.$or = [
          { name: { $regex: regex } },
          { nickName: { $regex: regex } },
        ];
      }

    if(req.query.nickName) {
        match.nickName = req.query.nickName;
    }

    if(req.query.firstName) {
        match.firstName = req.query.firstName;
    }

    if(req.query.lastName) {
        match.lastName = req.query.lastName;
    }

    if(req.query.name) {
        match.name = req.query.name;
    }

    if(req.query.email) {
        match.email = req.query.email;
    }

    if(req.query.me) {
        match._id = req.user._id;
    } else {
        match._id = { $ne: req.user._id };
    }

    if(req.query.sortBy) {
        const parts = req.query.sortBy.split(':');
        sort[parts[0]] = parts[1] === 'asc' ? 1 : -1;
    }

    try {
        const all_users = await User.find(match);
        const users = await User.find(match)
            .sort(sort)
            .limit(req.query.limit ? parseInt(req.query.limit) : 10)
            .skip(req.query.skip ? parseInt(req.query.skip) : 0);

        res.send({
            users: users,
            total: all_users.length 
        });
    } catch (e) {
        res.status(500).send();
    }

});

router.post('/users/me/avatar', auth, upload, async (req, res) => {
    const path = req.file.path.replace(/\\/g, '/');

    if(req.user.avatar && req.user.avatar !== 'assets/Universal-0/imgs/no-avatar-icon.jpg') {
        fs.unlink(req.user.avatar, (err) => {
            if (err) {
                console.log(err);
            }
        });
    }    

    req.user.avatar = path;
    await req.user.save();
    res.send(`${process.env.BACKEND_URL}${req.user.avatar}`);
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message });
});

router.get('/assets/:nickName-:id/imgs/:imageName', async (req, res) => {
    const _id = req.params.id;
    const nickName = req.params.nickName;
    const imageName = req.params.imageName;

    try {

        const imagePath = `./assets/${nickName}-${_id}/imgs/${imageName}`;

        if(fs.existsSync(imagePath)) {
            
            // JUST IN CASE WE WANT TO RESIZE THE IMAGE
            // const image = sharp(imagePath);
            // const resizedImage = image.resize(200, 200);
            // const mimeType = mime.lookup(imagePath);
            // res.setHeader('Content-Type', mimeType);
            // resizedImage.pipe(res);

            const file = fs.createReadStream(imagePath);
            const mimeType = mime.lookup(imagePath);
            res.setHeader('Content-Type', mimeType);
            file.pipe(res);

        } else {
            res.status(404).send();
        }

    } catch (e) {
        res.status(500).send();
    }
});

router.get('/users/me/likedStuff', auth, async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;

    try {
        const user = await User.findById(req.user._id)
            .populate({
                path: 'likedStuff',
                populate: [
                    { path: 'owner' }
                ]
            });

        const page = Math.floor(skip / limit);

        const likedStuffToJSON = {
            stuff: user.likedStuff.slice(page * limit, (page * limit) + limit).map((stuff) => {
                return {
                    ...stuff.toJSON(),
                    isLiked: req.user.likedStuff.includes(stuff._id)
                };
            }),
            total: req.user.likedStuff.length
        };
        
        res.send(likedStuffToJSON);
    } catch (e) {
        res.status(500).send();
    }

});

router.get('/users/me/likedCollections', auth, async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;

    try {
        const user = await User.findById(req.user._id)
            .populate({
                path: 'likedCollections',
                populate: [
                    { path: 'owner' },
                    { path: 'stuff'}
                ]
            });
        
        const page = Math.floor(skip / limit);
        
        const likedCollectionsToJSON = {
            collections: user.likedCollections.slice(page * 10, (page * 10) + 10).map((collection) => {
                return {
                    ...collection.toJSON(),
                    isLiked: req.user.likedCollections.includes(collection._id),
                    stuff: collection.stuff.map((stuff) => {
                        return {
                            ...stuff.toJSON(),
                            isLiked: req.user.likedStuff.includes(stuff._id)
                        };
                    })
                };
            }),
            total: req.user.likedCollections.length
        };
        
        res.send(likedCollectionsToJSON);
    } catch (e) {
        res.status(500).send();
    }

});

module.exports = router;
