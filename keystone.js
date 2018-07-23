require("dotenv").config();

const keystone = require("keystone");
const handlebars = require("express-handlebars");
const websockets = require("./websockets");
const request = require("request-promise");

const helpers = new require("./templates/views/helpers")();

module.exports.storage = new keystone.Storage({
  adapter: keystone.Storage.Adapters.FS,
  fs: {
    path: keystone.expandPath("./public/uploads"),
    publicPath: "/uploads"
  }
});

const messageColours = {
  red: 0xe74c3c,
  green: 0x2ecc71,
  blue: 0x3498db
};

keystone.set("log", function(message, colour, product, address) {
  if (!process.env.DISCORD_WEBHOOK) return;
  const serverURL = process.env.SERVER_URL || "https://market.switchcraft.pw";
  
  const fields = [];
  
  if (address) {
    fields.push({
      name: "Address",
      value: `[${address}](${helpers.kristweb(address)})`,
      inline: true
    });
  }
  
  const embed = {
    title: product.name,
    description: message.replace(/@/g, ":monkey_face:"),
    url: `${serverURL}/products/${product.slug}`,
    color: messageColours[colour],
    timestamp: new Date(),
    thumbnail: product.image ? {
      url: `${serverURL}/uploads/${product.image.filename}`
    } : null,
    fields
  };
  
  request(process.env.DISCORD_WEBHOOK, {
    method: "POST",
    body: { embeds: [embed] },
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
    helpers,
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
