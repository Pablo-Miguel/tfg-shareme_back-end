const express = require("express");
const auth = require("../middleware/auth");
const RatingMessage = require("../models/rating_message_model");
const QuestionAnswersMessage = require("../models/question_answer_message_model");
const Answer = require("../models/answer_model");
const router = new express.Router();

//Create a new rating message
router.post("/ratingMessages", auth, async (req, res) => {
    const ratingMessage = new RatingMessage({
        ...req.body,
        from: req.user._id
    });

    try {
        await ratingMessage.save();

        const newRatingMessage = await RatingMessage.findById(ratingMessage._id).populate("from");

        res.status(201).send(newRatingMessage);
    } catch (e) {
        return res.status(400).send(e);
    }
});

//Create a new question answer message
router.post("/questionAnswersMessages", auth, async (req, res) => {
    const questionAnswerMessage = new QuestionAnswersMessage({
        ...req.body,
        from: req.user._id
    });

    try {
        await questionAnswerMessage.save();

        const newQuestionAnswerMessage = await QuestionAnswersMessage.findById(questionAnswerMessage._id).populate("from");

        res.status(201).send(newQuestionAnswerMessage);
    } catch (e) {
        return res.status(400).send(e);
    }
});

//Create a new answer
router.post("/questionAnswersMessages/:id/answer", auth, async (req, res) => {
    const answer = new Answer({
        ...req.body,
        from: req.user._id,
        question: req.params.id
    });

    try {
        await answer.save();

        const newAnswer = await Answer.findById(answer._id).populate("from");

        res.status(201).send(newAnswer);

    } catch (e) {
        return res.status(400).send(e);
    }
});

module.exports = router;
