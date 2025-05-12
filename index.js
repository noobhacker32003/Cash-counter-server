const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://asheq100mahmud:${process.env.pass}@cluster0.ksnmbw6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

if (!uri) {
    console.error("❌ MONGO_URI not found in .env");
    process.exit(1);
}

const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function run() {
    try {
        await client.connect();
        console.log("✅ Connected to MongoDB");

        const db = client.db("Cash-counter");
        const transactionsCollection = db.collection("transactions");
        const clientsCollection = db.collection("clients");

        // POST: Add a transaction
        app.post('/transactions', async (req, res) => {
           const { name, type, amount, purpose } = req.body;

    if (!name || !type || !amount) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const transaction = {
        name,
        type,
        amount: parseFloat(amount),
        purpose: purpose || "", // ✅ this must be included!
        timestamp: new Date(),
    };

    await transactionsCollection.insertOne(transaction);
    
            const existingClient = await clientsCollection.findOne({ name });

            if (existingClient) {
                await clientsCollection.updateOne(
                    { name },
                    { $inc: { [type]: transaction.amount } }
                );
            } else {
                await clientsCollection.insertOne({
                    name,
                    theyOweYou: type === 'theyOweYou' ? transaction.amount : 0,
                    youOweThem: type === 'youOweThem' ? transaction.amount : 0,
                    createdAt: new Date(),
                });
            }

            res.status(201).json({ message: "Transaction added." });
        });

        app.get('/clients', async (req, res) => {
            const clients = await clientsCollection.find().toArray();
            res.send(clients);
        });

        app.get('/transactions', async (req, res) => {
            const transactions = await transactionsCollection
                .find()
                .sort({ timestamp: -1 })
                .toArray();
            res.send(transactions);
        });

        app.get('/transactions/:name', async (req, res) => {
            const name = req.params.name;
            const transactions = await transactionsCollection
                .find({ name })
                .sort({ timestamp: -1 })
                .toArray();
            res.send(transactions);
        });

    } catch (err) {
        console.error("MongoDB error:", err);
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('✅ Cash Counter Server Running');
});

app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});
