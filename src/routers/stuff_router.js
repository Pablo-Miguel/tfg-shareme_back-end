const express = require("express");
const auth = require("../middleware/auth");
const Stuff = require("../models/stuff_model");
const router = new express.Router();

//Create a 'stuff' post
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
    const total_stuff = await (await Stuff.find(match)).length;
    const stuff = await Stuff.find(match)
      .sort(sort)
      .limit(req.query.limit ? parseInt(req.query.limit) : 10)
      .skip(req.query.skip ? parseInt(req.query.skip) : 0)
      .populate("owner");

      console.log(match);

    res.send({ stuff : stuff, total: total_stuff });
  } catch (e) {
    res.status(500).send();
  }
});

module.exports = router;
