const keystone = require("keystone");
const Product = keystone.list("Product");
const p = require("es6-promisify").promisify;

exports = module.exports = async function(req, res) {
  const view = new keystone.View(req, res);
  const locals = res.locals;

  locals.section = "products";
  const sold = locals.filter = req.query.sold;
  
  const filters = {
    visible: true
  };
  
  if (!sold) filters.sold = false;
  if (sold === "sale") filters.sold = true;

  locals.products = await p(Product.paginate({
    page: req.query.page || 1,
    perPage: 12,
    maxPages: 5,
    filters
  })
    .populate("currentBid")
    .sort("-createdAt")
    .exec)();

  view.render("products");
};
