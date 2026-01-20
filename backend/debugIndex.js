const mongoose = require('mongoose');

console.log('Starting script...');
mongoose.connect('mongodb://localhost:27017/mts_db')
    .then(async () => {
        console.log('Connected!');
        const collection = mongoose.connection.db.collection('guests');
        const indexes = await collection.indexes();
        console.log('Indexes:', JSON.stringify(indexes, null, 2));

        const indexName = indexes.find(idx => idx.key.identityNumber)?.name;
        if (indexName) {
            console.log('Dropping index:', indexName);
            await collection.dropIndex(indexName);
            console.log('Dropped!');
        } else {
            console.log('Index NOT found.');
        }

        mongoose.disconnect();
    })
    .catch(err => {
        console.error('FULL ERROR:', err);
        process.exit(1);
    });
