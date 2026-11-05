const router = require('express').Router();
const c = require('../controllers/transactionController');
const requireUser = require('../middleware/requireUser');

router.use('/transactions', requireUser);

// Static routes must be declared before /:id
router.get('/transactions/summary', c.summary);
router.get('/transactions/trend', c.trend);

router.get('/transactions', c.list);
router.post('/transactions', c.create);
router.get('/transactions/:id', c.getOne);
router.put('/transactions/:id', c.update);
router.delete('/transactions/:id', c.remove);

module.exports = router;
