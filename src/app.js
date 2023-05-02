const express = require('express');
const cors = require('cors');
require('./db/mongoose');
const user_router = require('./routers/user_router');
const stuff_router = require('./routers/stuff_router');
const comment_router = require('./routers/comment_router');
const Collection = require('./models/collection_model');
const Answer = require('./models/answer_model');

const app = express();

//Define express port
const port = process.env.PORT || 3000;

//Define cors middleware to allow cross origin requests from the frontend app
app.use(cors());
//Define express middleware to parse incoming json data
app.use(express.json());
//Define express routers middlewares
app.use(user_router);
app.use(stuff_router);
app.use(comment_router);

//Start express server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});