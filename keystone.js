require("dotenv").config();

const keystone = require("keystone");
const handlebars = require("express-handlebars");
const websockets = require("./websockets");
const request = require("request-promise");

module.exports.storage = new keystone.Storage({
  adapter: keystone.Storage.Adapters.FS,
  fs: {
    path: keystone.expandPath("./public/uploads"),
    publicPath: "/uploads"
  }
});

keystone.set("log", function(message, product) {
  if (!process.env.DISCORD_WEBHOOK) return;
  const serverURL = process.env.SERVER_URL || "https://market.switchcraft.pw";
  let content = message;

  if (product) {
    content += `\n**[Listing](${serverURL}/products/${product.slug})**`;
    content += ` | **[Admin](${serverURL}/keystone/products/${product._id})**`;
  }
  
  request(process.env.DISCORD_WEBHOOK, {
    method: "POST",
    body: { content },
    json: true
  }).catch(error => {
    console.error("Error logging to discord:");
    console.error(error);
  });
});

keystone.init({
  "name": "SwitchMarket",
  "brand": "SwitchMarket",

  "sass": "public",
  "static": "public",
  "favicon": "public/favicon.ico",
  "views": "templates/views",
  "view engine": ".hbs",

  "custom engine": handlebars.create({
    layoutsDir: "templates/views/layouts",
    partialsDir: "templates/views/partials",
    defaultLayout: "default",
    helpers: new require("./templates/views/helpers")(),
    extname: ".hbs"
  }).engine,

  "auto update": true,
  "session": true,
  "auth": true,
  "user model": "User"
});

keystone.import("models");
keystone.set("locals", {
  _: require("lodash"),
  env: keystone.get("env"),
  utils: keystone.utils,
  editable: keystone.content.editable
});

keystone.set("routes", require("./routes"));

keystone.set("nav", {
  users: "users",
  bids: "bids",
  products: "products"
});

keystone.start({
  onStart() {
    websockets.start();
    const scheduler = require("./sale-scheduler");
    scheduler.start().catch(console.error);
  }
});
