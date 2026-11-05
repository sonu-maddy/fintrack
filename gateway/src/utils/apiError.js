// Same error format as the services.
const sendError = (req, res, status, code, message) =>
  res.status(status).json({ success: false, message, error: { code }, requestId: req.id });

module.exports = { sendError };
