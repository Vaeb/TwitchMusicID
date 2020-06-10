import { MongoClient } from 'mongodb';

export const mongoUrl = 'mongodb://localhost:27017';

export const dbName = 'tmusicid';

export const mongoClient = new MongoClient(mongoUrl);

export const db = mongoClient.db(dbName);

(async () => {
    try {
        await mongoClient.connect();
        console.log('Connected to mongo server successfully');
    } catch (err) {
        console.log(err);
    }
})();
