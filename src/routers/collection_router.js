const express = require("express");
const auth = require("../middleware/auth");
const Collection = require("../models/collection_model");
const User = require("../models/user_model");
const router = new express.Router();

//Create a new collection
router.post("/collections", auth, async (req, res) => {
    const collection = new Collection({
        ...req.body,
        owner: req.user._id
    });

    try {
        await collection.save();

        const newCollection = await Collection.findById(collection._id)
            .populate("owner")
            .populate({
                path: "stuff",
                populate: { path: "owner" }
            });

            const toJSONCollection = {
                ...newCollection.toJSON(),
                stuff: [
                    ...newCollection.stuff.map((stuff) => {
                        return {
                            ...stuff.toJSON()
                        };
                    })
                ]
            };

        res.status(201).send(toJSONCollection);
    } catch (e) {
        res.status(400).send(e);
    }
});

//Get all collections
router.get("/collections", auth, async (req, res) => {
    const match = {};
    const sort = {};

    if (req.query.text_searched && req.query.text_searched !== "") {
        const regex = new RegExp(req.query.text_searched, "i");
        match.$or = [
            { title: { $regex: regex } },
            { description: { $regex: regex } }
        ];
    }

    if (req.query.isMine && req.query.isMine === "true") {
        match.owner = req.user._id;
    } else {
        match.owner = { $ne: req.user._id };
    }

    if (req.query.other_user_id && !req.query.isMine) {
        match.owner = req.query.other_user_id;
    }

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(":");
        sort[parts[0]] = parts[1] === "desc" ? -1 : 1;
    }

    try {
        const allCollections = await Collection.find(match);

        const collections = await Collection.find(match)
            .populate("owner")
            .populate({
                path: "stuff",
                populate: { path: "owner" }
            })
            .sort(sort)
            .limit(req.query.limit ? parseInt(req.query.limit) : 10)
            .skip(req.query.skip && allCollections.length > req.query.skip ? parseInt(req.query.skip) : 0);
        
        const toJSONCollections = collections.map((collection) => {
            return {
                ...collection.toJSON(),
                stuff: [
                    ...collection.stuff.map((stuff) => {
                        return {
                            ...stuff.toJSON(),
                            isLiked: stuff.owner._id.toString() !== req.user._id.toString() ? stuff.likes.includes(req.user._id) : true
                        };
                    })
                ],
                isLiked: collection.owner._id.toString() !== req.user._id.toString() ? collection.likes.includes(req.user._id) : true
            };
        });

        res.send({
            collections: toJSONCollections,
            total: allCollections.length
        });
    } catch (e) {   
        res.status(500).send();
    }
});

//Get a collection by id
router.get("/collections/:id", auth, async (req, res) => {
    const match = {};
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const skip = req.query.skip ? parseInt(req.query.skip) : 0;

    if(req.query.text_searched && req.query.text_searched !== "") {
        const regex = new RegExp(req.query.text_searched, "i");
        match.$or = [
            { title: { $regex: regex } },
            { description: { $regex: regex } }
        ];
    }

    if(req.query.category && req.query.category !== "") {
        match.category = req.query.category;
    }
    
    try {
        const collection = await Collection.findById(req.params.id)
            .populate("owner")
            .populate({
                path: "stuff",
                match,
                populate: { path: "owner" }
            });

        if (!collection) {
            return res.status(404).send();
        }

        const page = Math.floor(skip / limit);

        const toJSONCollection = {
            ...collection.toJSON(),
            stuff: [
                ...collection.stuff.slice(page * limit, (page * limit) + limit).map((stuff) => {
                    return {
                        ...stuff.toJSON(),
                        isLiked: stuff.owner._id.toString() !== req.user._id.toString() ? stuff.likes.includes(req.user._id) : true
                    };
                })
            ],
            totalStuff: collection.stuff.length,
            isLiked: collection.owner._id.toString() !== req.user._id.toString() ? collection.likes.includes(req.user._id) : true
        };

        res.send(toJSONCollection);
    } catch (e) {
        res.status(500).send();
    }
});

//Update a collection by id
router.patch("/collections/:id", auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ["title", "description", "stuff"];
    const isValidOperation = updates.every((update) => {
        return allowedUpdates.includes(update);
    });

    if (!isValidOperation) {
        return res.status(400).send({ error: "Invalid updates!" });
    }

    try {
        const collection = await Collection.findOne({
            _id: req.params.id,
            owner: req.user._id
        });

        if (!collection) {
            return res.status(404).send();
        }

        updates.forEach((update) => {
            collection[update] = req.body[update];
        });

        await collection.save();

        const newCollection = await Collection.findById(collection._id)
            .populate("owner")
            .populate({
                path: "stuff",
                populate: { path: "owner" }
            });

        const toJSONCollection = {
            ...newCollection.toJSON(),
            stuff: [
                ...newCollection.stuff.map((stuff) => {
                    return {
                        ...stuff.toJSON()
                    };
                })
            ]
        };

        res.send(toJSONCollection);
    } catch (e) {
        res.status(400).send(e);
    }
});

//Delete a collection by id
router.delete("/collections/:id", auth, async (req, res) => {
    try {
        const collection = await Collection.findOneAndDelete({
            _id: req.params.id,
            owner: req.user._id
        });

        if (!collection) {
            return res.status(404).send();
        }

        await User.updateMany({}, { $pull: { likedCollections: collection._id } });

        res.send(collection);
    } catch (e) {
        res.status(500).send();
    }
});

//Add stuff to a collection
router.post("/collections/:id/stuff", auth, async (req, res) => {
    try {
        const collection = await Collection.findOne({
            _id: req.params.id,
            owner: req.user._id
        });

        if (!collection) {
            return res.status(404).send();
        }

        const stuff = req.body.stuff;

        if (Array.isArray(stuff)) {
            let error = null;

            stuff.forEach((stuff) => {
                if (collection.stuff.includes(stuff)) {
                    error = { error: "Some of the Stuff already in collection!" };
                }
            });

            if (error) {
                return res.status(400).send(error);
            }

        } else {

            if (collection.stuff.includes(stuff)) {
                return res.status(400).send({ error: "Stuff already in collection!" });
            }
        }        

        collection.stuff = collection.stuff.concat(stuff);
        await collection.save();

        const newCollection = await Collection.findById(collection._id)
            .populate("owner")
            .populate({
                path: "stuff",
                populate: { path: "owner" }
            });

        const toJSONCollection = {
            ...newCollection.toJSON(),
            stuff: [
                ...newCollection.stuff.map((stuff) => {
                    return {
                        ...stuff.toJSON()
                    };
                })
            ]
        };

        res.send(toJSONCollection);
    } catch (e) {
        res.status(400).send(e);
    }
});

//Remove stuff from a collection
router.delete("/collections/:id/stuff", auth, async (req, res) => {
    try {
        const collection = await Collection.findOne({
            _id: req.params.id,
            owner: req.user._id
        });

        if (!collection) {
            return res.status(404).send();
        }

        const stuff = req.body.stuff;

        if(Array.isArray(stuff)) {
            return res.status(400).send({ error: "Can't remove multiple stuff at once!" });
        }

        if (!collection.stuff.includes(stuff)) {
            return res.status(400).send({ error: "Stuff not in collection!" });
        }

        collection.stuff = collection.stuff.filter((stuffId) => {
            return stuffId.toString() !== stuff.toString();
        });

        await collection.save();

        const newCollection = await Collection.findById(collection._id)
            .populate("owner")
            .populate({
                path: "stuff",
                populate: { path: "owner" }
            });

        const toJSONCollection = {
            ...newCollection.toJSON(),
            stuff: [
                ...newCollection.stuff.map((stuff) => {
                    return {
                        ...stuff.toJSON()
                    };
                })
            ]
        };
        
        res.send(toJSONCollection);
    } catch (e) {
        res.status(400).send(e);
    }
});

//Add a view to a collection
router.post("/collections/:id/view", async (req, res) => {
    try {
        const collection = await Collection.findById(req.params.id);

        if (!collection) {
            return res.status(404).send();
        }

        collection.views = collection.views + 1;
        await collection.save();

        res.send(collection);
    } catch (e) {
        res.status(500).send();
    }
});

//Add a like to a collection
router.post("/collections/:id/like", auth, async (req, res) => {
    try {
        const collection = await Collection.findById(req.params.id);

        if (!collection) {
            return res.status(404).send();
        }

        if (collection.likes.includes(req.user._id)) {
            return res.status(400).send({ error: "Already liked collection!" });
        }

        collection.likes = collection.likes.concat(req.user._id);
        await collection.save();

        req.user.likedCollections.unshift(collection._id);
        await req.user.save();
        
        res.send(collection);
    } catch (e) {
        res.status(500).send();
    }
});

//Remove a like from a collection
router.delete("/collections/:id/unlike", auth, async (req, res) => {
    try {
        const collection = await Collection.findById(req.params.id);

        if (!collection) {
            return res.status(404).send();
        }

        if (!collection.likes.includes(req.user._id)) {
            return res.status(400).send({ error: "Not liked collection!" });
        }

        collection.likes = collection.likes.filter((userId) => {
            return userId.toString() !== req.user._id.toString();
        });

        await collection.save();

        req.user.likedCollections = req.user.likedCollections.filter((collectionId) => {
            return collectionId.toString() !== collection._id.toString();
        });

        await req.user.save();

        res.send(collection);
    } catch (e) {
        res.status(500).send();
    }
});

module.exports = router;