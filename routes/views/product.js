const _ = require("lodash");
const keystone = require("keystone");
const Product = keystone.list("Product");
const Bid = keystone.list("Bid");

exports = module.exports = async function(req, res) {
  const view = new keystone.View(req, res);
  const locals = res.locals;

  locals.section = "products";

  locals.product = await Product.model.findOne({
    slug: req.params.slug
  })
    .populate("currentBid createdBy")
    .exec();

  if (!locals.product) {
    return res.status(404).send(keystone.wrapHTMLError("Sorry, this product could not be found."));
  } else {
    locals.bids = _.map(await Bid.model.find()
      .where("item", locals.product._id)
      .sort("-createdAt")
      .exec(), (rawBid, i, bids) => {
      return {
        address: rawBid.address,
        amount: rawBid.amount,
        username: rawBid.username, 
        createdAt: rawBid.createdAt,
        delta: bids[i + 1]
          ? rawBid.amount - bids[i + 1].amount
          : 0
      };
    });
    
    view.render("product");
  }
};
