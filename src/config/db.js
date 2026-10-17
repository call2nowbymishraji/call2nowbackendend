const mongoose = require('mongoose');

module.exports = async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('[db] connected:', mongoose.connection.name);
};
