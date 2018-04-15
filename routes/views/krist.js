const keystone = require("keystone");
const Product = keystone.list("Product");
const Bid = keystone.list("Bid");

const request = require("request-promise");
const kristUtils = require("krist-utils");

const PRIVATEKEY = process.env.KRIST_PRIVATEKEY;
const ADDRESS = kristUtils.makeV2Address(PRIVATEKEY);
const WEBHOOK_TOKEN = process.env.KRIST_WEBHOOK_TOKEN;

console.log(ADDRESS);

exports = module.exports = async function(req, res) {
  if (
       !req.body 
    || !req.body.token 
    ||  req.body.token !== WEBHOOK_TOKEN 
    || !req.body.event 
    ||  req.body.event !== "transaction" 
    || !req.body.transaction
    ||  req.body.transaction.to !== ADDRESS
  ) return res.status(400).send("die");
  
  console.log(require("util").inspect(req.body, {
    colors: true,
    showHidden: true,
    depth: null
  }));

  const transaction = req.body.transaction;
  const meta = kristUtils.parseCommonMeta(transaction.metadata);
  
  function sendTransaction(to, amount, metadata) {
    return request
      .post("https://krist.ceriat.net/transactions")
      .form({
        privatekey: PRIVATEKEY,
        to, amount, metadata
      });    
  }
  
  async function refundTransaction(refundReason) {
    refundReason += ` (send to \`product@${res.locals.marketName}\` to bid)`;
    await sendTransaction(req.body.transaction.from, req.body.transaction.value, `error=${refundReason}`);
  }
  
  if (!meta) return await refundTransaction("Could not parse CommonMeta");
  if (!meta.username) return await refundTransaction("Username not specified");
  if (!meta.metaname) return await refundTransaction("Metaname not specified");
  
  const metaname = meta.metaname;
  const product = await Product.model.findOne({
    slug: metaname
  })
    .populate("currentBid")
    .exec();
  
  if (!product) return await refundTransaction("Product not found");
  
  if (product.currentBid) {
    const currentBid = product.currentBid;
    
    if (req.body.transaction.value <= currentBid.amount) return await refundTransaction("Not enough to out-bid current bid");
    
    const message = req.body.transaction.from === currentBid.address 
      ? `return=${product.slug}@${res.locals.marketName};message=You out-bid yourself on ${product.name}.`      
      : `return=${product.slug}@${res.locals.marketName};message=You were out-bid on ${product.name}! Send to \`${product.slug}@${res.locals.marketName}\` to bid again.`;
    
    sendTransaction(
      currentBid.address, 
      currentBid.amount, 
      message
    );
  }

  if (product.reserve && req.body.transaction.value < product.reserve) return await refundTransaction("Must be above reserve price");
  
  const newBid = new Bid.model({
    item: product,
    address: req.body.transaction.from,
    amount: req.body.transaction.value,
    username: meta.username
  });
  await newBid.save();
  
  product.currentBid = newBid;
  await product.save();
  
  return res.send("ya");
};
