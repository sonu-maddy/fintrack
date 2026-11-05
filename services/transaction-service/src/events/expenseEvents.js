const publisher = require('./publisher');
const logger = require('../config/logger');

// Fire-and-forget: the HTTP request never waits for the broker.
// eventId is deterministic, so a duplicate delivery is recognised by the consumer.
function publishExpenseCreated(tx, requestId) {
  const payload = {
    eventId: `expense.created:${tx._id}`,
    transactionId: String(tx._id),
    userId: tx.userId,
    amount: tx.amountPaise / 100,
    category: tx.category,
    date: tx.date.toISOString().slice(0, 10),
    occurredAt: new Date().toISOString(),
  };
  publisher
    .publish('expense.created', payload)
    .then((ok) => logger.info({ requestId, eventId: payload.eventId, published: ok }, 'expense.created event'))
    .catch((err) => logger.error({ requestId, err: err.message }, 'expense.created publish failed'));
}

module.exports = { publishExpenseCreated };
