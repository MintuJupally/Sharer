module.exports = (errorFunction) => {
  return (req, res, next) => {
    errorFunction(req, res, next).catch(next);
  };
};
