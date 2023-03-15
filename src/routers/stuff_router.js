const express = require('express');
const auth = require('../middleware/auth');
const router = new express.Router();

//Create a 'stuff' post
router.post('/stuff', auth, async (req, res) => {
    const stuff = new Stuff({
        ...req.body,
        owner: req.user._id
    });

    try {
        await stuff.save();

        res.status(201).send(stuff);
    } catch (e) {
        res.status(400).send(e);
    }
});

module.exports = router;
