const _ = require("lodash");

const keystone = require("keystone");
const Product = keystone.list("Product");
const moment = require("moment");

const schedule = require("node-schedule");

const jobs = {};

let io;

async function markAsSold(oldProduct) {
  if (!io) io = keystone.get("io");
  
  const product = await Product.model.findOne({
    _id: oldProduct._id
  });
  
  if (product) {
    product.sold = true;
    product.save();
    
    io.sockets.emit("sold", _.omit(product, ["createdBy", "updatedBy"]));
    
    console.log(`Marked product ${product.name} as sold`);
  } else {
    console.log(`Product ${oldProduct._id} (${oldProduct.name}) no longer exists`);
  }
}

async function scheduleProduct(product) {
  if (moment().isAfter(moment(product.endsAt))) {
    return await markAsSold(product);
  }
  
  console.log(`Scheduling product ${product.name} for ${product.endsAt}`);
  jobs[product._id] = {
    job: schedule.scheduleJob(product.endsAt, () => markAsSold(product)),
    product: product
  };
}

module.exports.updateProduct = async function(product) {
  if (jobs[product._id] && jobs[product._id].product.endsAt !== product.endsAt) {
    console.log(`Product ${product.name} updated`);
    jobs[product._id].job.cancel();
  } else {
    console.log(`Product ${product.name} added`);
  }
  
  await scheduleProduct(product);
};

module.exports.start = async function() {
  const products = await Product.model.find({
    saleType: "auction",
    sold: false
  });
  
  if (products) products.forEach(scheduleProduct);
};
