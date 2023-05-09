const express = require('express');
const User = require('../models/user_model');
const auth = require('../middleware/auth');
const router = new express.Router();

//Create a post to signup a new user
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

//Create a post to login a user
router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password);
        const token = await user.generateAuthToken();
        
        res.send({ user, token });
    } catch (e) {
        res.status(400).send();
    }
});

//Create a get to logout a user
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

//Create a get to logout a user from all devices
router.get('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = [];

        await req.user.save();

        res.send();
    } catch (e) {
        res.status(500).send();
    }
});

//Who am I?
router.get('/users/me', auth, async (req, res) => {
    res.send(req.user);
});

//Create a patch to update a user
router.patch('/users/me', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['firstName', 'lastName', 'email', 'password'];
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

//Create a delete to remove a user
router.delete('/users/me', auth, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user._id);
        
        res.send(req.user);
    } catch (e) {
        res.status(500).send();
    }
});

//Search for a user
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

//Follow a user
router.get('/users/:id/follow', auth, async (req, res) => {
    const _id = req.params.id;

    try {

        if(!req.user._id.equals(_id)) {
            req.user.following.push(_id);
            await req.user.save();

            const followedUser = await User.findById(_id);
            followedUser.followers.push(req.user._id);
            await followedUser.save();
        }

        res.send({
            ...req.user.toJSON(),
            isFollowing: !req.user._id.equals(_id) ? req.user.following.includes(_id) : true
        });

    } catch (e) {
        res.status(500).send();
    }
});

//Unfollow a user
router.get('/users/:id/unfollow', auth, async (req, res) => {
    const _id = req.params.id;

    try {

        if(!req.user._id.equals(_id)) {
            req.user.following = req.user.following.filter((id) => {
                return !id.equals(_id);
            });
            await req.user.save();
        
            const followedUser = await User.findById(_id);
            followedUser.followers = followedUser.followers.filter((id) => {
                return !id.equals(req.user._id);
            });
            await followedUser.save();

        }

        res.send({
            ...req.user.toJSON(),
            isFollowing: !req.user._id.equals(_id) ? req.user.following.includes(_id) : true
        });

    } catch (e) {
        res.status(500).send();
    }
});

//Get all followers
router.get('/users/:id/followers', auth, async (req, res) => {
    const _id = req.params.id;
    
    try {

        const user = await User.findById(_id).populate('followers');
        
        if (!user) {
            return res.status(404).send();
        }
        
        const followers = user.followers.map((follower) => {
            return {
                ...follower.toJSON(),
                isFollowing: !req.user._id.equals(follower._id) ? req.user.following.includes(follower._id) : true
            };
        });

        res.send(followers);
        
    } catch (e) {
        res.status(500).send();
    }
});

//Get all following
router.get('/users/:id/following', auth, async (req, res) => {
    const _id = req.params.id;

    try {

        const user = await User.findById(_id).populate('following');

        if (!user) {
            return res.status(404).send();
        }

        const following = user.following.map((followedUser) => {
            return {
                ...followedUser.toJSON(),
                isFollowing: !req.user._id.equals(followedUser._id) ? req.user.following.includes(followedUser._id) : true
            };
        });

        res.send(following);

    } catch (e) {
        res.status(500).send();
    }
});

// Get users
router.get('/users', auth, async (req, res) => {
    const match = {};
    const sort = {};

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

    if(req.query.sortBy) {
        const parts = req.query.sortBy.split(':');
        sort[parts[0]] = parts[1] === 'asc' ? 1 : -1;
    }

    try {
        const users = await User.find(match).sort(sort);

        res.send(users);
    } catch (e) {
        res.status(500).send();
    }

});



module.exports = router;
