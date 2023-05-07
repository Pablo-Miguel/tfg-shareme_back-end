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

module.exports = router;
