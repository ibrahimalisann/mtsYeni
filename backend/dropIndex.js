const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/mts_db', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(async () => {
        console.log('Connected to MongoDB');

        // Get the collection
        const db = mongoose.connection.db;
        const collection = db.collection('guests');

        try {
            // List indexes
            const indexes = await collection.indexes();
            console.log('Current indexes:', indexes);

            // Find index with identityNumber
            const indexName = indexes.find(idx => idx.key.identityNumber)?.name;

            if (indexName) {
                console.log(`Dropping index: ${indexName}`);
                await collection.dropIndex(indexName);
                console.log('Index dropped successfully');
            } else {
                console.log('identityNumber index not found');
            }
        } catch (err) {
            console.error('Error handling index:', err.message);
        } finally {
            mongoose.disconnect();
        }
    })
    .catch(err => {
        console.error('Connection error:', err);
        process.exit(1);
    });
