const keystone = require("keystone");
const socket = require("socket.io");

module.exports.start = async function() {
  const server = keystone.httpServer;
  keystone.set("io", socket.listen(server)).get("io");
};
