import { MongoClient } from 'mongodb';

export const mongoUrl = 'mongodb://localhost:27017';

export const dbName = 'tmusicid';

let db;
// export const getDb = () => db;

let dbPromiseResolve;
export const dbPromise = new Promise((resolve) => {
    dbPromiseResolve = resolve;
});

MongoClient.connect(mongoUrl)
    .then((client) => {
        console.log('Mongo connected successfully!');

        db = client.db(dbName);
        client.close();

        dbPromiseResolve(db);
    })
    .catch((err) => {
        console.log('Mongo failed to connect:', err);
    });
