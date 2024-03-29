const express = require("express");
const auth = require("../middleware/auth");
const fs = require('fs');
const Stuff = require("../models/stuff_model");
const User = require("../models/user_model");
const Collection = require("../models/collection_model");
const RatingComment = require('../models/rating_comment_model');
const QuestionAnswersComment = require('../models/question_answer_comment_model');
const Answer = require('../models/answer_model');
const { upload } = require("../../controllers/upload");
const router = new express.Router();

router.post("/stuff/add-new-stuff", auth, async (req, res) => {
  const stuff = new Stuff({
    ...req.body,
    owner: req.user._id,
  });

  try {
    await stuff.save();

    const newStuff = await Stuff.findById(stuff._id).populate("owner");

    res.status(201).send(newStuff);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.get("/stuff", auth, async (req, res) => {
  const match = {};
  const sort = {};

  if (req.query.text_searched && req.query.text_searched !== "") {
    const regex = new RegExp(req.query.text_searched, "i");
    match.$or = [
      { title: { $regex: regex } },
      { description: { $regex: regex } },
    ];
  }

  if (req.query.category) {
    match.category = req.query.category;
  }

  if (req.query.price) {
    match.price = parseFloat(req.query.price);
  }

  if (req.query.has_offer) {
    match.has_offer = req.query.has_offer === "true" ? true : false;
    if (match.has_offer === true) {
      match.offer_price = req.query.offer_price;
    }
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
    const all_stuff = await Stuff.find(match);
    const stuff = await Stuff.find(match)
      .sort(sort)
      .limit(req.query.limit ? parseInt(req.query.limit) : 10)
      .skip(req.query.skip ? parseInt(req.query.skip) : 0)
      .populate("owner");

    let new_stuff = stuff.map(item => {
      return { 
        ...item.toJSON(),
        isLiked: item.likes.filter((l) => l.toString() === req.user._id.toString()).length > 0 
      };
    });
    
    res.send({ stuff : new_stuff, total: all_stuff.length });
  } catch (e) {
    res.status(500).send();
  }
});

router.get("/stuff/:id", auth, async (req, res) => {
  const _id = req.params.id;

  try {
    const stuff = await Stuff.findOne({ _id })
    .populate("owner")
    .populate({
      path: "ratingComments",
      populate: { path: "from" },
      options: { sort: { "createdAt": -1 } }
    })
    .populate({
      path: "questionAnswersComments",
      populate: [
        { path: "from" },
        { path: "answers", populate: "from", options: { sort: { "createdAt": -1 } } }
      ],
      options: { sort: { "createdAt": -1 } }
    });

    if (!stuff) {
      return res.status(404).send();
    }

    const isMine = stuff.owner._id.toString() === req.user._id.toString();

    const ratingComments = stuff.ratingComments.map(rating => rating.toJSON());

    const questionAnswersComments = stuff.questionAnswersComments.map(question => ({
      ...question.toJSON(),
      answers: question.answers.map(answer => answer.toJSON())
    }));

    res.send({ stuff: {
      ...stuff.toJSON(),
      ratingComments,
      questionAnswersComments
    } , isLiked: isMine ? true : stuff.likes.filter((l) => l.toString() === req.user._id.toString()).length > 0});
  } catch (e) {
    res.status(500).send();
  }
});

router.get("/stuff/:id/like", auth, async (req, res) => {
  try {
    const stuff = await Stuff.findOne({
      _id: req.params.id
    }).populate("owner");

    if (!stuff) {
      return res.status(404).send();
    }

    if(stuff.likes.includes(req.user._id)) {
      return res.status(400).send({ error: "Already liked stuff!" });
    }

    if (stuff.likes.filter((l) => l.toString() === req.user._id.toString()).length === 0) {
      stuff.likes = stuff.likes.concat(req.user._id);
      await stuff.save();

      req.user.likedStuff.unshift(stuff._id);
      await req.user.save();
    }
    
    res.send(stuff);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.get("/stuff/:id/unlike", auth, async (req, res) => {
  try {
    const stuff = await Stuff.findOne({
      _id: req.params.id
    }).populate("owner");

    if (!stuff) {
      return res.status(404).send();
    }

    if(!stuff.likes.includes(req.user._id)) {
      return res.status(400).send({ error: "Already unliked stuff!" });
    }

    if (stuff.likes.filter((l) => l.toString() === req.user._id.toString()).length > 0) {
      stuff.likes = stuff.likes.filter((l) => l.toString() !== req.user._id.toString());
      await stuff.save();

      req.user.likedStuff = req.user.likedStuff.filter((l) => l.toString() !== stuff._id.toString());
      await req.user.save();
    }

    res.send(stuff);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.get("/stuff/:id/view", auth, async (req, res) => {
  try {
    const stuff = await Stuff.findOne({
      _id: req.params.id
    }).populate("owner");

    if (!stuff) {
      return res.status(404).send();
    }

    stuff.views = stuff.views + 1;
    await stuff.save();

    res.send(stuff);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.patch("/stuff/:id", auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = [
    "title",
    "description",
    "category",
    "price",
    "has_offer",
    "offer_price",
    "shopping_link"
  ];
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) {
    return res.status(400).send({ error: "Invalid updates!" });
  }

  try {
    const stuff = await Stuff.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).populate("owner");

    if (!stuff) {
      return res.status(404).send();
    }

    updates.forEach((update) => (stuff[update] = req.body[update]));
    await stuff.save();
    res.send(stuff);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.delete("/stuff/:id", auth, async (req, res) => {
  const stuffId = req.params.id;
  try {
    const stuff = await Stuff.findOne({
      _id: stuffId,
      owner: req.user._id,
    }).populate("questionAnswersComments");

    if (!stuff) {
      res.status(404).send();
    }

    await Answer.deleteMany({
      question: {
        $in: stuff.questionAnswersComments.map((question) => question._id),
      },
    });

    await QuestionAnswersComment.deleteMany({ stuff: stuff._id });

    await RatingComment.deleteMany({ stuff: stuff._id });

    const collections = await Collection.find({ stuff: stuff._id });
    
    for (const collection of collections) {
      collection.stuff.pull(stuff._id);
      if (collection.stuff.length === 0) {
        await Collection.findByIdAndDelete(collection._id);
        await User.updateMany({}, { $pull: { likedCollections: collection._id } });
      } else {
        await collection.save();
      }
    }

    if(stuff.image && stuff.image !== "assets/Universal-0/imgs/no-image-icon.png") {
      fs.unlink(stuff.image, (err) => {
        if (err) {
          console.log(err);
        }
      });
    }

    await User.updateMany({}, { $pull: { likedStuff: stuff._id } });

    await Stuff.findByIdAndDelete(stuff._id);

    res.send('Deleted!');
  } catch (e) {
    res.status(500).send();
  }
});

router.post("/stuff/:id/image", auth, upload, async (req, res) => {
  try {
    const stuff = await Stuff.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).populate("owner");

    if (!stuff) {
      return res.status(404).send();
    }

    if(stuff.image && stuff.image !== "assets/Universal-0/imgs/no-image-icon.png") {
      fs.unlink(stuff.image, (err) => {
        if (err) {
          console.log(err);
        }
      });
    }

    const path = req.file.path.replace(/\\/g, '/');
    stuff.image = path;
    await stuff.save();

    res.send(stuff);
  } catch (e) {
    res.status(500).send();
  }
}, (error, req, res, next) => {
  res.status(400).send({ error: error.message });
});

module.exports = router;
