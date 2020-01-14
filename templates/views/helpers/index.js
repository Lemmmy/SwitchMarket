const moment = require("moment");
const _ = require("lodash");
const hbs = require("handlebars");
const keystone = require("keystone");
const cloudinary = require("cloudinary");
const krist = require("krist-utils");
const qs = require("querystring");

// Collection of templates to interpolate
const linkTemplate = _.template(`<a href="<%= url %>"><%= text %></a>`);
const paginationLinkTemplate = _.template(`<a href="<%= url %>" class="page-link"><%= text %></a>`);
const scriptTemplate = _.template(`<script src="<%= src %>"></script>`);
const cssLinkTemplate = _.template(`<link href="<%= href %>" rel="stylesheet">`);

module.exports = function() {
  const _helpers = {};

  _helpers.size = function(a, b, options) {
    return Math.abs(b - a);
  };

  _helpers.area = function(a, b, c, d, options) {
    return (Math.abs(b - a) * Math.abs(d - c));
  };

  _helpers.volume = function(a, b, c, d, e, f, options) {
    return (Math.abs(b - a) * Math.abs(d - c) * Math.abs(f - e));
  };

  _helpers.showVolume = function(a, b, options) {
    return (Math.min(a, b) !== 0 || Math.max(a, b) !== 255);
  };
  
  _helpers.acres = function(a, options) {
    return (Number(a) * 0.000247105).toFixed(2);
  };
  
  _helpers.iso = function(a, options) {
    return moment(a).toISOString();
  };

  _helpers.formatTime = function(a, options) {
    return moment(a).format("YYYY/MM/DD HH:mm:ss");
  };

  _helpers.section = function(name, options) {
    if (!this.sections) this.sections = {};
    this.sections[name] = options.fn(this);
    return null;
  };
  
  _helpers.toLocaleString = function(number, options) {
    return Number(number).toLocaleString();
  };
  
  _helpers.gte = function(a, b, options) {
    return Number(a) >= Number(b);
  };
  
  _helpers.krist = function(a, options) {
    return Number(a).toLocaleString() + " KST";
  };

  _helpers.kristweb = function(a, options) {
    if (krist.isValidKristAddress(a)) {
      return `https://krist.club/addresses/${a}`;
    } else if (/^(?:[a-z0-9-_]{1,32}@)?[a-z0-9]{1,64}\.kst$/.test(a)) {
      return `https://krist.club/names/${a}`;      
    }
  };
  
  _helpers.center = function(a, b, options) {
    return Math.floor((Number(a) + Number(b)) / 2);
  };
  
  _helpers.dynmap = function(product, options) {
    return `https://dynmap.switchcraft.pw/?worldname=${product.world || "world"}&mapname=flat&zoom=7&x=${_helpers.center(product.startX, product.endX)}&y=${_helpers.center(product.startY, product.endY)}&z=${_helpers.center(product.startZ, product.endZ)}`;
  };
  
  /**
	 * Generic HBS Helpers
	 * ===================
	 */

	// standard hbs equality check, pass in two values from template
	// {{#ifeq keyToCheck data.myKey}} [requires an else blockin template regardless]
  _helpers.ifeq = function(a, b, options) {
    if (a == b) { // eslint-disable-line eqeqeq
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  };

	/**
	 * Port of Ghost helpers to support cross-theming
	 * ==============================================
	 *
	 * Also used in the default keystonejs-hbs theme
	 */

	// ### Date Helper
	// A port of the Ghost Date formatter similar to the keystonejs - pug interface
	//
	//
	// *Usage example:*
	// `{{date format='MM YYYY}}`
	// `{{date publishedDate format='MM YYYY'`
	//
	// Returns a string formatted date
	// By default if no date passed into helper than then a current-timestamp is used
	//
	// Options is the formatting and context check this.publishedDate
	// If it exists then it is formated, otherwise current timestamp returned

  _helpers.date = function(context, options) {
    if (!options && context.hasOwnProperty("hash")) {
      options = context;
      context = undefined;

      if (this.publishedDate) {
        context = this.publishedDate;
      }
    }

		// ensure that context is undefined, not null, as that can cause errors
    context = context === null ? undefined : context;

    const f = options.hash.format || "MMM Do, YYYY";
    const timeago = options.hash.timeago;
    let date;

    // if context is undefined and given to moment then current timestamp is given
		// nice if you just want the current year to define in a tmpl
    if (timeago) {
      date = moment(context).fromNow();
    } else {
      date = moment(context).format(f);
    }
    return date;
  };

	/**
	 * KeystoneJS specific helpers
	 * ===========================
	 */

	// block rendering for keystone admin css
  _helpers.isAdminEditorCSS = function(user, options) {
    let output = "";
    if (typeof (user) !== "undefined" && user.isAdmin) {
      output = cssLinkTemplate({
        href: "/keystone/styles/content/editor.min.css"
      });
    }
    return new hbs.SafeString(output);
  };

	// block rendering for keystone admin js
  _helpers.isAdminEditorJS = function(user, options) {
    let output = "";
    if (typeof (user) !== "undefined" && user.isAdmin) {
      output = scriptTemplate({
        src: "/keystone/js/content/editor.js"
      });
    }
    return new hbs.SafeString(output);
  };

	// Used to generate the link for the admin edit post button
  _helpers.adminEditableUrl = function(user, options) {
    const rtn = keystone.app.locals.editable(user, {
      list: "Product",
      id: options
    });
    const fuck = JSON.parse(rtn);
    fuck.path = `/${fuck.path}`;
    return JSON.stringify(fuck);
  };

	// ### CloudinaryUrl Helper
	// Direct support of the cloudinary.url method from Handlebars (see
	// cloudinary package documentation for more details).
	//
	// *Usage examples:*
	// `{{{cloudinaryUrl image width=640 height=480 crop='fill' gravity='north'}}}`
	// `{{#each images}} {{cloudinaryUrl width=640 height=480}} {{/each}}`
	//
	// Returns an src-string for a cloudinary image

  _helpers.cloudinaryUrl = function(context, options) {

		// if we dont pass in a context and just kwargs
		// then `this` refers to our default scope block and kwargs
		// are stored in context.hash
    if (!options && context.hasOwnProperty("hash")) {
			// strategy is to place context kwargs into options
      options = context;
			// bind our default inherited scope into context
      context = this;
    }

		// safe guard to ensure context is never null
    context = context === null ? undefined : context;

    if ((context) && (context.public_id)) {
      options.hash.secure = keystone.get("cloudinary secure") || false;
      const imageName = context.public_id.concat(".", context.format);
      return cloudinary.url(imageName, options.hash);
    }
    else {
      return null;
    }
  };

  _helpers.productUrl = function(postSlug, options) {
    return ("/product/" + postSlug);
  };

  _helpers.pageUrl = function(query, pageNumber, options) {
    if (!query) query = {};
    query.page = pageNumber;
    
    return "/products?" + qs.stringify(query);
  };

    // ### Pagination Helpers
	// These are helpers used in rendering a pagination system for content
	// Mostly generalized and with a small adjust to `_helper.pageUrl` could be universal for content types

	/*
	* expecting the data.posts context or an object literal that has `previous` and `next` properties
	* ifBlock helpers in hbs - http://stackoverflow.com/questions/8554517/handlerbars-js-using-an-helper-function-in-a-if-statement
	* */
  _helpers.ifHasPagination = function(postContext, options) {
		// if implementor fails to scope properly or has an empty data set
		// better to display else block than throw an exception for undefined
    if (_.isUndefined(postContext)) {
      return options.inverse(this);
    }
    if (postContext.next || postContext.previous) {
      return options.fn(this);
    }
    return options.inverse(this);
  };

  _helpers.paginationNavigation = function(query, pages, currentPage, totalPages, options) {
    let html = "";

    // pages should be an array ex.  [1,2,3,4,5,6,7,8,9,10, '....']
		// '...' will be added by keystone if the pages exceed 10
    _.each(pages, function(page, ctr) {
			// create ref to page, so that '...' is displayed as text even though int value is required
      const pageText = page;
      // create boolean flag state if currentPage
      const isActivePage = ((page === currentPage) ? true : false);
      // need an active class indicator
      const liClass = ((isActivePage) ? " class=\"page-item active\"" : " class=\"page-item\"");

      // if '...' is sent from keystone then we need to override the url
      if (page === "...") {
				// check position of '...' if 0 then return page 1, otherwise use totalPages
        page = ((ctr) ? totalPages : 1);
      }

			// get the pageUrl using the integer value
      const pageUrl = _helpers.pageUrl(query, page);
      // wrapup the html
      html += "<li" + liClass + ">" + paginationLinkTemplate({ url: pageUrl, text: pageText }) + "</li>\n";
    });
    return html;
  };

	// special helper to ensure that we always have a valid page url set even if
	// the link is disabled, will default to page 1
  _helpers.paginationPreviousUrl = function(query, previousPage, totalPages) {
    if (previousPage === false) {
      previousPage = 1;
    }
    return _helpers.pageUrl(query, previousPage);
  };

	// special helper to ensure that we always have a valid next page url set
	// even if the link is disabled, will default to totalPages
  _helpers.paginationNextUrl = function(query, nextPage, totalPages) {
    if (nextPage === false) {
      nextPage = totalPages;
    }
    return _helpers.pageUrl(query, nextPage);
  };


	//  ### Flash Message Helper
	//  KeystoneJS supports a message interface for information/errors to be passed from server
	//  to the front-end client and rendered in a html-block.  FlashMessage mirrors the Pug Mixin
	//  for creating the message.  But part of the logic is in the default.layout.  Decision was to
	//  surface more of the interface in the client html rather than abstracting behind a helper.
	//
	//  @messages:[]
	//
	//  *Usage example:*
	//  `{{#if messages.warning}}
	//      <div class="alert alert-warning">
	//          {{{flashMessages messages.warning}}}
	//      </div>
	//   {{/if}}`

  _helpers.flashMessages = function(messages) {
    let output = "";

    for (let i = 0; i < messages.length; i++) {
      if (messages[i].title) {
        output += "<h4>" + messages[i].title + "</h4>";
      }

      if (messages[i].detail) {
        output += "<p>" + messages[i].detail + "</p>";
      }

      if (messages[i].list) {
        output += "<ul>";
        for (let ctr = 0; ctr < messages[i].list.length; ctr++) {
          output += "<li>" + messages[i].list[ctr] + "</li>";
        }
        output += "</ul>";
      }
    }

    return new hbs.SafeString(output);
  };


	//  ### underscoreMethod call + format helper
	//	Calls to the passed in underscore method of the object (Keystone Model)
	//	and returns the result of format()
	//
	//  @obj: The Keystone Model on which to call the underscore method
	//	@undescoremethod: string - name of underscore method to call
	//
	//  *Usage example:*
	//  `{{underscoreFormat enquiry 'enquiryType'}}

  _helpers.underscoreFormat = function(obj, underscoreMethod) {
    return obj._[underscoreMethod].format();
  };

  return _helpers;
};
