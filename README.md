# Tweet Visualizations

This repo contains two projects:

## TweetLoader

This reads the data in RawTweets and ProcessedTweets and produces entityMap.json and rawTweets.json which summarise and cross reference the data.  These are copied to the TweetVisualization\data folder where they are used by the TweetVisualization server.

To run:
* `npm install`
* `npm start`

## TweetVisualization

This app includes a server that provides an api into the tweet data, and some examples of visualising the results.

Open the TweetVisualization folder in terminal and run the following commands:

* `npm install`
* `npm run build`
* `npm start`

Then visit https://localhost:3000 in your web browser!

To run the client with hot-reload:
* `npm start`
* `npm run dev`

Then visit https://localhost:8080.  Api calls will be proxied to the server on 3000.

