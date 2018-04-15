const keystone = require("keystone");
const middleware = require("./middleware");
const importRoutes = keystone.importer(__dirname);

keystone.pre("routes", middleware.initLocals);
keystone.pre("render", middleware.flashMessages);

const routes = {
  views: importRoutes("./views")
};

exports = module.exports = function(app) {
  app.get("/", routes.views.index);
  app.get("/products", routes.views.products);
  app.get("/products/:slug", routes.views.product);
  app.post("/krist", routes.views.krist);
};
