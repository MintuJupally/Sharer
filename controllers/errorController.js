const AppError = require('../utils/appError');

const sendError = (err, req, res) => {
  //API
  console.log(err);

  if (req.originalUrl.startsWith('/api/')) {
    return res.status(err.statusCode).send({
      status: err.status,
      name: err.name,
      message: err.message,
    });
  }
};

module.exports = (err, req, res, next) => {
  // console.log(err.stack);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  sendError(err, req, res);
};
