const router = require('express').Router();
const c = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');
const loginLimiter = require('../middleware/loginLimiter');

router.post('/register', c.register);
router.post('/login', loginLimiter, c.login);
router.post('/refresh', c.refresh);
router.post('/logout', c.logout);
router.get('/me', authenticate, c.me);

module.exports = router;
