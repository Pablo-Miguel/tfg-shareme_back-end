const express = require("express");
const auth = require("../middleware/auth");
const RatingComment = require("../models/rating_comment_model");
const QuestionAnswersComment = require("../models/question_answer_comment_model");
const Answer = require("../models/answer_model");
const router = new express.Router();

//Create a new rating comment
router.post("/ratingComments/:stuff_id", auth, async (req, res) => {
    const ratingComment = new RatingComment({
        ...req.body,
        stuff: req.params.stuff_id,
        from: req.user._id
    });

    try {
        await ratingComment.save();

        const newRatingComment = await RatingComment.findById(ratingComment._id).populate("from");

        res.status(201).send(newRatingComment);
    } catch (e) {
        return res.status(400).send(e);
    }
});

//Create a new question answer comment
router.post("/questionAnswersComments/:stuff_id/question", auth, async (req, res) => {
    const questionAnswerComment = new QuestionAnswersComment({
        ...req.body,
        stuff: req.params.stuff_id,
        from: req.user._id
    });

    try {
        await questionAnswerComment.save();

        const newQuestionAnswerComment = await QuestionAnswersComment.findById(questionAnswerComment._id).populate("from");

        res.status(201).send({ ...newQuestionAnswerComment.toJSON(), answers: [] });
    } catch (e) {
        return res.status(400).send(e);
    }
});

//Create a new answer
router.post("/questionAnswersComments/:question_id/answer", auth, async (req, res) => {
    const answer = new Answer({
        ...req.body,
        from: req.user._id,
        question: req.params.question_id
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
