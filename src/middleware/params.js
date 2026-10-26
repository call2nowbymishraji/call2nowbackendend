// Mongo throws a CastError inside the controller when an :id is not a valid
// ObjectId, which would surface as a 500 carrying an internal message. Rejecting
// at the router keeps the response clean and the error out of the process.
const isObjectId = (v) => /^[0-9a-f]{24}$/i.test(String(v));

const objectIdParam = (req, res, next, val) => {
  if (!isObjectId(val)) return res.status(400).json({ message: 'Invalid id' });
  next();
};

module.exports = { objectIdParam, isObjectId };
