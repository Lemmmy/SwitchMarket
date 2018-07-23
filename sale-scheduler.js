const _ = require("lodash");

const keystone = require("keystone");
const moment = require("moment");

const schedule = require("node-schedule");

const jobs = {};

let io;
let Product;

async function markAsSold(oldProduct) {
  if (!io) io = keystone.get("io");
  
  const product = await Product.model.findOne({
    _id: oldProduct._id
  });
  
  if (product) {
    product.sold = true;
    product.save();
    
    io.sockets.emit("sold", _.omit(product, ["createdBy", "updatedBy"]));

    if (product.currentBid) {
      await product.populate("currentBid").execPopulate();
      
      if (product.currentBid.amount >= (product.reserve || 0)) {
        keystone.get("log")(`:white_check_mark: Sold for **${product.currentBid.amount.toLocaleString()} KST** to **${product.currentBid.username.substring(0, 16)}**!`, "green", product, product.currentBid.address);
      } else {
        keystone.get("log")(`:x: Auction ended but did not meet the reserve price.`, "red", product);
      }
    } else {
      keystone.get("log")(`:x: Auction ended with no bids.`, "red", product);
    }
    
    console.log(`Marked product ${product.name} as sold`);
  } else {
    console.log(`Product ${oldProduct._id} (${oldProduct.name}) no longer exists`);
  }
}

async function scheduleProduct(product) {
  if (!product.endsAt || !product.visible) return;
  
  console.log(`Scheduling product ${product.name} for ${product.endsAt} (pre)`);
  
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
    
    if (!jobs[product._id] && product.visible) { // product was just made visible
      const seller = product.seller || `${product.createdBy.name.first} ${product.createdBy.name.last}`;
      keystone.get("log")(`:new: For sale ${product.compulsory ? "on behalf of" : "by"}: **${seller}**!`, "green", product);
    }
    
    jobs[product._id].job.cancel();
  } else {
    console.log(`Product ${product.name} added`);
  }
  
  await scheduleProduct(product);
};

module.exports.start = async function() {
  Product = keystone.list("Product");
  
  const products = await Product.model.find({
    saleType: "auction",
    sold: false,
    visible: true
  });
  
  if (products) products.forEach(scheduleProduct);
};
