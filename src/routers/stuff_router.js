const express = require("express");
const auth = require("../middleware/auth");
const Stuff = require("../models/stuff_model");
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

    res.send({ stuff : new_stuff, total: new_stuff.length });
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

    if (stuff.likes.filter((l) => l.toString() === req.user._id.toString()).length === 0) {
      stuff.likes = stuff.likes.concat(req.user._id);
      await stuff.save();
    }
    
    res.send(stuff);
  } catch (e) {
    res.send(400).send(e);
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

    if (stuff.likes.filter((l) => l.toString() === req.user._id.toString()).length > 0) {
      stuff.likes = stuff.likes.filter((l) => l.toString() !== req.user._id.toString());
      await stuff.save();
    }

    res.send(stuff);
  } catch (e) {
    res.send(400).send(e);
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
    res.send(400).send(e);
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
    "image",
    "shopping_link",
    "views",
    "likes"
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
    res.send(400).send(e);
  }
});

router.delete("/stuff/:id", auth, async (req, res) => {
  try {
    const stuff = await Stuff.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    }).populate("owner");

    if (!stuff) {
      res.status(404).send();
    }

    res.send(stuff);
  } catch (e) {
    res.status(500).send();
  }
});

module.exports = router;
