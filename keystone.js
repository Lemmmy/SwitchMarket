require("dotenv").config();

const keystone = require("keystone");
const handlebars = require("express-handlebars");

module.exports.storage = new keystone.Storage({
  adapter: keystone.Storage.Adapters.FS,
  fs: {
    path: keystone.expandPath("./public/uploads"),
    publicPath: "/uploads"
  }
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

keystone.start();
