const requestLogger = (request, response, next) => {
  console.log('request method: ' + request.method);
  console.log('request path: ' + request.path);
  console.log('request body: ');
  console.log(request.body);
  console.log('--------------------------------------------------');
  next();
};

module.exports = requestLogger;
