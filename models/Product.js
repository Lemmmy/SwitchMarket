const keystone = require("keystone");
const Types = keystone.Field.Types;

const app = require("../keystone");
const moment = require("moment");

const Product = new keystone.List("Product", {
  autokey: { path: "slug", from: "name", unique: true },
  defaultSort: "-createdAt",
  drilldown: "currentBid",
  track: true
});

Product.add({
  name: { type: String, required: true },
  saleType: { type: Types.Select, options: "auction" },
  productType: { type: Types.Select, options: "claim" },
  sold: { type: Boolean, default: false },
  reserve: { type: Number, default: 0, dependsOn: { saleType: "auction" } },
  currentBid: { type: Types.Relationship, ref: "Bid", required: false },
  endsAt: { type: Date, default: moment().add(3, "days") },
  world: { type: String, default: "world" },
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
Product.register();

const scheduler = require("../sale-scheduler"); // fuck it

Product.schema.post("save", product => {
  console.log(require("util").inspect(product, {
    colors: true,
    showHidden: true,
    depth: null
  }));
  
  if (!product.sold) scheduler.updateProduct(product).catch(console.error);
});

scheduler.start().catch(console.error);
