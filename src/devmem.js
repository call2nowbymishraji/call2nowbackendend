// Demo mode: boots an in-memory MongoDB (no local install needed) and then the API.
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mem = await MongoMemoryServer.create();
  process.env.MONGO_URI = mem.getUri('call2now');
  console.log('[dev:mem] in-memory mongo at', process.env.MONGO_URI);
  await require('./seed').run();
  require('./index.js');
  process.on('exit', () => mem.stop());
})();
