require('dotenv').config()

const express = require('express');
const apicache = require("apicache");
const morgan = require('morgan');
const redis = require('redis');
const { IgApiClient } = require('instagram-private-api');
const fs = require('fs');
const https = require('https');
const app = express();
const port = 4000;
const Queue = require('bull');
const cache = apicache.options({ redisClient: redis.createClient() }).middleware

// use the morgan middleware to log incoming requests
app.use(express.json());
app.use(morgan(':date[iso] :method :url :status :res[content-length] - :response-time ms'));
app.use(cache('2 hours'));

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With,content-type");
    res.header('Access-Control-Allow-Methods', 'POST');
    res.header('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

// Create a new queue
const imageDownloadQueue = new Queue('image download queue');

// Create an instance of the Instagram Private API client
const ig = new IgApiClient();
let loggedInUser;

(async () => {
    try {
        ig.state.generateDevice(process.env.IGUSERNAME);
        loggedInUser = await ig.account.login(process.env.IGUSERNAME, process.env.PASSWORD);
        await ig.account.currentUser();
        console.log("Instagram Logged in")
    } catch (error) {
        console.error(error);
    }
})();

// Middleware to set headers and handle errors
const handleRequest = (req, res, callback) => {
    try {
        console.log(`Received request
            - HTTP ${req.method}
            - query: ${JSON.stringify(req.query)}
            - body: ${JSON.stringify(req.body)}`
        );

        callback(req, res);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Function to fetch close friends
const getCloseFriends = async () => {
    const closeFriends = ig.feed.bestFriendships();

    return closeFriends.items();
}

const saveInstagramPictures = (user) => {
    const filepath = `./public/instagram/${user.username}.jpg`;

    if (!fs.existsSync(filepath)) {
        const file = fs.createWriteStream(filepath);

        console.log(`Downloading ${filepath}`);

        // send a request to the server and pipe the response to the file
        https.get(user.profile_pic_url, (response) => {
            response.pipe(file);
        });
    }
}

// Process the queued tasks
imageDownloadQueue.process(async job => {
    await saveInstagramPictures(job.data.friend);
});

// Set up a route to fetch the user's Friends lists
app.get('/friends', (req, res) => {
    handleRequest(req, res, async () => {
        const friendsFeed = ig.feed.accountFollowers(loggedInUser.pk);
        let allFriends = [];
        let moreAvailable;

        do {
            let friends = await friendsFeed.items(); // Pega os itens da página atual

            // Filtra os amigos se houver um termo de busca
            if (req.query.searchTerm) {
                friends = friends.filter(friend => {
                    const { username, full_name } = friend;
                    return username.includes(req.query.searchTerm) || full_name.includes(req.query.searchTerm);
                });
            }

            allFriends = allFriends.concat(friends); // Adiciona os amigos filtrados ao array total

            moreAvailable = friendsFeed.isMoreAvailable(); // Verifica se há mais páginas
            // Não é necessário chamar items() novamente aqui, a chamada do próximo ciclo do loop fará isso

        } while (moreAvailable);

        res.json(allFriends);
    });
});

// Endpoint to get current close friends
app.get('/close-friends', (req, res) => {
    handleRequest(req, res, async () => {
        // Fetch the user's close friends lists
        res.json(await getCloseFriends());
    });
});

// Endpoint to set close friends
app.post('/close-friends', (req, res) => {
    handleRequest(req, res, async () => {
        if (req.body && req.body.closeFriendsList) {
            // Get current list of close friends
            const closeFriends = await getCloseFriends();
            const closeFriendsIds = closeFriends.map((user) => user.pk);

            // Set close friends
            ig.friendship.setBesties({
                add: req.body.closeFriendsList,
                remove: closeFriendsIds,
            });
        }

        res.sendStatus(200);
    });
});

// Start the server
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});