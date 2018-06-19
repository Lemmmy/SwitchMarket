const keystone = require("keystone");
const Types = keystone.Field.Types;

const app = require("../keystone");

const Product = new keystone.List("Product", {
  autokey: { path: "slug", from: "name", unique: true },
  defaultSort: "-createdAt",
  drilldown: "currentBid",
  track: true
});

Product.add({
  name: { type: String, required: true },
  visible: { type: Boolean, default: false },
  saleType: { type: Types.Select, options: "auction" },
  productType: { type: Types.Select, options: "claim" },
  seller: { type: String },
  compulsory: { type: Boolean, default: false },
  sold: { type: Boolean, default: false },
  reserve: { type: Number, default: 0, dependsOn: { saleType: "auction" } },
  extensionMinutes: { type: Number, default: 30, dependsOn: { saleType: "auction" } },
  auctionDurationMinutes: { type: Number, default: 0 },
  currentBid: { type: Types.Relationship, ref: "Bid", required: false },
  endsAt: { type: Date, default: null },
  world: { type: String, default: "world" },
  warpName: { type: String },
  startX: { type: Number, default: 0, dependsOn: { productType: "claim" } },
  startY: { type: Number, default: 0, dependsOn: { productType: "claim" } },
  startZ: { type: Number, default: 0, dependsOn: { productType: "claim" } },
  endX: { type: Number, default: 0, dependsOn: { productType: "claim" } },
  endY: { type: Number, default: 0, dependsOn: { productType: "claim" } },
  endZ: { type: Number, default: 0, dependsOn: { productType: "claim" } },
  description: { type: Types.Markdown, height: 200 },
  image: { type: Types.File, storage: app.storage }
});

Product.defaultColumns = "name, saleType, productType, sold, currentBid";

const scheduler = require("../sale-scheduler"); // fuck it

Product.schema.post("save", function(product) {
  console.log("Product saved");
  console.log(require("util").inspect(product, {
    colors: true,
    showHidden: true,
    depth: null
  }));

  if (!product.sold) scheduler.updateProduct(product).catch(console.error);
});

Product.register();
