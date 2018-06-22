const _ = require("lodash");
const keystone = require("keystone");
const Product = keystone.list("Product");
const Bid = keystone.list("Bid");

const { getMinimumIncrement } = require("../../utils.js");

exports = module.exports = async function(req, res) {
  const view = new keystone.View(req, res);
  const locals = res.locals;

  locals.section = "products";

  const product = locals.product = await Product.model.findOne({
    slug: req.params.slug,
    visible: true
  })
    .populate("currentBid createdBy")
    .exec();
  
  if (!locals.product) {
    return res.status(404).send(keystone.wrapHTMLError("Sorry, this product could not be found."));
  } else {
    const currentBidAmount = product.currentBid ? (product.currentBid.amount || 0) : 0;
    const minimumIncrement = getMinimumIncrement(currentBidAmount);
    locals.minimumBid = currentBidAmount + minimumIncrement;
    
    if (!product.currentBid && product.minimumReserve) locals.minimumBid = product.reserve;

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
