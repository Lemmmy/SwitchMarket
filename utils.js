module.exports.getMinimumIncrement = function(bid) {
  if (bid < 20) {
    return 1;
  } else if (bid < 50) {
    return Math.floor(bid / 10);
  } else if (bid < 600) {
    return 5;
  } else {
    return Math.floor(bid / 100);
  }
};
