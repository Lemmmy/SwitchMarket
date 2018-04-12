const keystone = require("keystone");
const Types = keystone.Field.Types;

const Bid = new keystone.List("Bid", {
  defaultSort: "-createdAt"
});

Bid.add({
  item: { type: Types.Relationship, ref: "Product" },
  address: { type: String },
  username: { type: String },
  amount: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

Bid.defaultColumns = "id, item, address, username, amount, createdAt";
Bid.register();
