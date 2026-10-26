// Express 4 never catches a rejected async handler: the rejection becomes an
// unhandledRejection and Node kills the process. Every controller goes through
// this so a failure becomes a 500 response instead of an outage.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = wrap;
