/**
 * This file contains the common middleware used by your routes.
 *
 * Extend or replace these functions as your application requires.
 *
 * This structure is not enforced, and just a starting point. If
 * you have more middleware you may want to group it as separate
 * modules in your project's /lib directory.
 */

import * as keystone from 'keystone';
import * as _ from 'lodash';
import * as querystring from 'querystring';


/**
 * Initialises the standard view locals
 *
 * The included layout depends on the navLinks array to generate
 * the navigation in the header, you may wish to change this array
 * or replace it with your own templates / logic.
 */
export const initLocals = function (req, res, next) {
    const locals = res.locals;
    locals.navLinks = [
        { label: 'Home', key: 'home', href: '/' },
        { label: 'Blog', key: 'blog', href: '/blog' },
        { label: 'Gallery', key: 'gallery', href: '/gallery' },
        { label: 'Contact', key: 'contact', href: '/contact' },
    ];
    locals.user = req.user;
    locals.basedir = keystone.get('basedir');

    locals.page = {
        title: 'SydJS',
        path: req.url.split('?')[0] // strip the query - handy for redirecting back to the page
    };

    locals.qs_set = qs_set(req, res);

    if (req.cookies.target && req.cookies.target == locals.page.path) res.clearCookie('target');

    const bowser = require('../lib/node-bowser').detect(req);

    locals.system = {
        mobile: bowser.mobile,
        ios: bowser.ios,
        iphone: bowser.iphone,
        ipad: bowser.ipad,
        android: bowser.android
    };

    next();
};

/**
 * Inits the error handler functions into `req`
 */

export const initErrorHandlers = function (req, res, next) {
    res.err = function (err, title, message) {
        res.status(500).render('errors/500', {
            err: err,
            errorTitle: title,
            errorMsg: message
        });
    };
    res.notfound = function (title, message) {
        res.status(404).render('errors/404', {
            errorTitle: title,
            errorMsg: message
        });
    };
    next();
};

/**
 * Fetches and clears the flashMessages before a view is rendered
 */
export const flashMessages = function (req, res, next) {
    const flashMessages = {
        info: req.flash('info'),
        success: req.flash('success'),
        warning: req.flash('warning'),
        error: req.flash('error'),
    };
    res.locals.messages = _.some(flashMessages, function (msgs) { return msgs.length; }) ? flashMessages : false;
    next();
};


/**
 * Prevents people from accessing protected pages when they're not signed in
 */
export const requireUser = function (req, res, next) {
    if (!req.user) {
        req.flash('error', 'Please sign in to access this page.');
        res.redirect('/signin');
    } else {
        next();
    }
};


/**
 * Returns a closure that can be used within views to change a parameter in the query string
 * while preserving the rest.
 */

export const qs_set = function (req, res) {
    return function qs_set(obj) {
        const params = _.clone(req.query);
        for (const i in obj) {
            if (obj[i] === undefined || obj[i] === null) {
                delete params[i];
            } else if (obj.hasOwnProperty(i)) {
                params[i] = obj[i];
            }
        }
        const qs = querystring.stringify(params);
        return req.path + (qs ? '?' + qs : '');
    };
};
