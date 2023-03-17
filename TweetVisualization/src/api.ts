// api.js - api route module
// tslint:disable: no-console
import express = require("express");
import path = require("path");
import fs = require("fs");

const router = express.Router();

type TTweetEntity = {
    Name: string;
    Type: string;
    Subtype: string;
};

type TTweetData = {
    KeyPhrases: string[];
    SentimentScore: number;
    EntityRecords: TTweetEntity[];
};

type TTweetMapEntry = {
    Entity: TTweetEntity;
    Count: number;
    AverageSentiment: number;
    ids: string[];
    SentimentDist: Record<number, number>;
    RelatedEntities?: Record<string, { Count: number; AverageSentiment: number }>;
};

let entityMap: Map<string, TTweetMapEntry>;

type TRawTweet = {
    id: string;
    date: number;
    lang: string;
    source: string;
    text: string;
    metrics: { retweets: number; replies: number; likes: number; quotes: number };
    sentiment: number;
};

const tweetMap = new Map<string, TRawTweet>();

const loadEntityMap = () => {
    const entityMapPath = path.join(__dirname, "../data/entityMap.json");
    const entityMapJson: string = fs.readFileSync(entityMapPath, "utf8");
    entityMap = new Map<string, TTweetMapEntry>(JSON.parse(entityMapJson));
    console.log(`Loaded ${entityMap.size} entities`);
};
loadEntityMap();

const loadTweetMap = () => {
    const rawTweetPath = path.join(__dirname, "../data/rawTweets.json");
    const rawTweetJson: string = fs.readFileSync(rawTweetPath, "utf8");
    const rawTweets: TRawTweet[] = JSON.parse(rawTweetJson);
    console.log(`Loaded ${rawTweets.length} tweets`);
    rawTweets.forEach(t => tweetMap.set(t.id, t));
};
loadTweetMap();

router.get("/tweetData/Sentiment/:names", (req, res) => {
    const data: Array<{ name: string; yValues: number[] }> = [];
    if (req.params.names) {
        const nameList = req.params.names.split(",");
        for (const name of nameList) {
            const yValues = Array.from(Array(101)).fill(0);
            const entity = entityMap.get(name);
            if (entity) {
                const sentiment = entity.SentimentDist;
                for (const key in sentiment) {
                    if (Object.prototype.hasOwnProperty.call(sentiment, key)) {
                        const val = sentiment[key];
                        yValues[parseInt(key)] = val;
                    }
                }
                data.push({ name, yValues });
            }
        }
    }
    res.send(data);
});

router.get("/tweetData/Related/:names", (req, res) => {
    const data: Array<{
        name: string;
        count: number;
        related: Record<string, { Count: number; AverageSentiment: number }>;
    }> = [];
    if (req.params.names) {
        const nameList = req.params.names.split(",");
        for (const name of nameList) {
            const entity = entityMap.get(name);
            if (entity) {
                data.push({ name, count: entity.Count, related: entity.RelatedEntities });
            }
        }
    }
    res.send(data);
});

router.get("/tweetData/Entities/:type?", (req, res) => {
    let data: Array<{ name: string; count: number }> = [];
    if (req.params.type) {
        data = Array.from(entityMap.values())
            .filter(t => t.Entity.Type === req.params.type)
            .map(t => ({ name: t.Entity.Name, count: t.Count, sentiment: t.AverageSentiment }));
    } else {
        data = Array.from(entityMap.values()).map(t => ({
            name: t.Entity.Name,
            count: t.Count,
            sentiment: t.AverageSentiment
        }));
    }
    data = data.sort((a, b) => b.count - a.count);
    if (req.query.limit) {
        const toSend = data.slice(0, parseInt(req.query.limit.toString()));
        res.send(toSend);
    } else {
        res.send(data);
    }
});

router.get("/tweetData/Raw/:entity?", (req, res) => {
    if (req.params.entity) {
        const entity = entityMap.get(req.params.entity);
        const data: TRawTweet[] = [];
        for (const id of entity.ids) {
            data.push(tweetMap.get(id));
        }
        res.send(data);
    } else {
        res.send(Array.from(tweetMap.values()));
    }
});

export { router as api };
