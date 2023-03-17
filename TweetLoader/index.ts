import * as path from "path";
import * as fs from "fs";

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

const loadProcessedTweetData = (folderName: string) => {
    const entitymap = new Map<string, TTweetMapEntry>();
    const idSentiment: Record<string, number> = {};
    const directoryPath = path.join(__dirname, folderName);
    const files = fs.readdirSync(directoryPath);
    const processedTweets: TTweetData[] = [];
    files.forEach(function (file) {
        const fullPath = path.join(directoryPath, file);
        const json: TTweetData = JSON.parse(fs.readFileSync(fullPath, "utf8"));
        if (json.EntityRecords) {
            processedTweets.push(json);
            const sentimentBucket = Math.floor(json.SentimentScore * 100);
            idSentiment[file] = json.SentimentScore;
            for (const entity of json.EntityRecords) {
                let entry = entitymap.get(entity.Name);
                if (!entry) {
                    entry = {
                        Entity: { Name: entity.Name, Type: entity.Type, Subtype: entity.Subtype },
                        Count: 0,
                        AverageSentiment: 0,
                        ids: [],
                        SentimentDist: {}
                    };
                    entitymap.set(entity.Name, entry);
                }
                entry.ids.push(file);
                entry.AverageSentiment =
                    (entry.AverageSentiment * entry.Count + json.SentimentScore) / (entry.Count + 1);
                entry.Count++;
                if (entry.SentimentDist[sentimentBucket]) {
                    entry.SentimentDist[sentimentBucket]++;
                } else {
                    entry.SentimentDist[sentimentBucket] = 1;
                }
            }
            //console.log(`Loaded ${json.EntityRecords.length} entities from ${fullPath}`);
        }
    });
    console.log(`Got data on ${entitymap.size} entities`);

    // get top entities
    for (const topEntity of Array.from(entitymap.values())) {
        if (topEntity.Count < 10) continue;
        // find tweets containing that entity
        const tweets = processedTweets.filter(t => t.EntityRecords.some(e => e.Name === topEntity.Entity.Name));
        const entitySentimentMap = new Map<string, { Count: number; AverageSentiment: number }>();
        // build a map of sentiment breakdown for other entities
        for (const tweet of tweets) {
            for (const entity of tweet.EntityRecords) {
                if (entity.Name === topEntity.Entity.Name) continue;
                let entry = entitySentimentMap.get(entity.Name);
                if (!entry) {
                    entry = {
                        Count: 0,
                        AverageSentiment: 0
                    };
                    entitySentimentMap.set(entity.Name, entry);
                }
                entry.AverageSentiment =
                    (entry.AverageSentiment * entry.Count + tweet.SentimentScore) / (entry.Count + 1);
                entry.Count++;
            }
        }
        Array.from(entitySentimentMap.entries()).forEach(e => {
            if (e[1].Count === 1) {
                entitySentimentMap.delete(e[0]);
            }
        });
        console.log(`Found ${entitySentimentMap.size} related entities for ${topEntity.Entity.Name}`);
        const oe = entitymap.get(topEntity.Entity.Name);
        if (oe) {
            oe.RelatedEntities = Object.fromEntries(entitySentimentMap);
        }
    }
    const outputJson = JSON.stringify(Array.from(entitymap.entries()));
    fs.writeFileSync("../TweetVisualization/data/entityMap.json", outputJson);
    return idSentiment;
};

type TRawTweetData = {
    created_at: string;
    lang: string;
    source: string;
    text: string;
    public_metrics: { retweet_count: number; reply_count: number; like_count: number; quote_count: number };
};

type TRawTweet = {
    id: string;
    date: number;
    lang: string;
    source: string;
    text: string;
    metrics: { retweets: number; replies: number; likes: number; quotes: number };
    sentiment: number;
};

const loadRawTweetData = (folderName: string, idSentiment: Record<string, number>) => {
    const rawTweets: TRawTweet[] = [];
    const directoryPath = path.join(__dirname, folderName);
    const files = fs.readdirSync(directoryPath);
    files.forEach(function (file) {
        const fullPath = path.join(directoryPath, file);
        const json: TRawTweetData = JSON.parse(fs.readFileSync(fullPath, "utf8"));
        if (json) {
            const t: TRawTweet = {
                id: file,
                date: Date.parse(json.created_at),
                lang: json.lang,
                source: json.source,
                text: json.text,
                metrics: {
                    likes: json.public_metrics.like_count,
                    quotes: json.public_metrics.quote_count,
                    replies: json.public_metrics.reply_count,
                    retweets: json.public_metrics.retweet_count
                },
                sentiment: idSentiment[file]
            };
            rawTweets.push(t);
        }
    });
    console.log(`Loaded ${rawTweets.length} tweets`);
    const outputJson = JSON.stringify(rawTweets);
    fs.writeFileSync("../TweetVisualization/data/rawTweets.json", outputJson);
};

const idSentiment = loadProcessedTweetData("ProcessedTweets");
loadRawTweetData("RawTweets", idSentiment);
