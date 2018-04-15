const keystone = require("keystone");
const Product = keystone.list("Product");

exports = module.exports = async function(req, res) {
  const view = new keystone.View(req, res);
  const locals = res.locals;

  locals.section = "products";

  locals.product = await Product.model.findOne({
    slug: req.params.slug
  })
    .populate("currentBid createdBy")
    .exec();

  console.log(require("util").inspect(locals.product, {
    colors: true,
    showHidden: true,
    depth: null
  }));

  if (!locals.product) {
    return res.status(404).send(keystone.wrapHTMLError("Sorry, this product could not be found."));
  } else {
    view.render("product");
  }
};
