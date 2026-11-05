const router = require('express').Router();
const c = require('../controllers/notificationController');
const requireUser = require('../middleware/requireUser');

router.use(['/notifications', '/settings'], requireUser);

router.get('/notifications', c.list);
router.patch('/notifications/read-all', c.markAllRead); // before /:id
router.patch('/notifications/:id/read', c.markRead);

router.get('/settings/threshold', c.getThreshold);
router.put('/settings/threshold', c.setThreshold);

module.exports = router;
