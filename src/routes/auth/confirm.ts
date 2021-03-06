import * as keystone from 'keystone';
import * as async from 'async';
import * as request from 'request';
import * as _ from 'lodash';
const User = keystone.list('User');

export = function (req, res) {

    const view = new keystone.View(req, res),
        locals = res.locals;

    locals.section = 'profile';
    locals.form = req.body;
    locals.returnto = req.query.returnto;

    locals.authUser = req.session.auth;
    locals.existingUser = false;

    // Reject request if no auth data is stored in session
    if (!locals.authUser) {
        console.log('[auth.confirm] - No auth data detected, redirecting to signin.');
        console.log('------------------------------------------------------------');
        return res.redirect('/signin');
    }

    // Set existing user if already logged in
    if (req.user) {
        locals.existingUser = req.user;
    }

    // Function to handle signin
    const doSignIn = function () {

        console.log('[auth.confirm] - Signing in user...');
        console.log('------------------------------------------------------------');

        const onSuccess = function (user) {
            console.log('[auth.confirm] - Successfully signed in.');
            console.log('------------------------------------------------------------');
            return res.redirect(req.cookies.target || '/me');
        };

        const onFail = function (err) {
            console.log('[auth.confirm] - Failed signing in.', err);
            console.log('------------------------------------------------------------');
            req.flash('error', 'Sorry, there was an issue signing you in, please try again.');
            return res.redirect('/signin');
        };

        keystone.session.signin(String(locals.existingUser._id), req, res, onSuccess, onFail);

    };

    // Function to check if a user already exists for this profile id (and sign them in)
    const checkExisting = function (next) {

        if (locals.existingUser) return checkAuth();

        console.log('[auth.confirm] - Searching for existing users via [' + locals.authUser.type + '] profile id...');
        console.log('------------------------------------------------------------');

        const query = User.model.findOne();
        query.where('services.' + locals.authUser.type + '.profileId', locals.authUser.profileId);
        query.exec(function (err, user) {
            if (err) {
                console.log('[auth.confirm] - Error finding existing user via profile id.', err);
                console.log('------------------------------------------------------------');
                return next(new Error('Sorry, there was an error processing your information, please try again.'));
            }
            if (user) {
                console.log('[auth.confirm] - Found existing user via [' + locals.authUser.type + '] profile id...');
                console.log('------------------------------------------------------------');
                locals.existingUser = user;
                return doSignIn();
            }
            return next();
        });

    };

    // Function to handle data confirmation process
    const checkAuth = function () {

        async.series([

            // Check for user by email (only if not signed in)
            function (next) {

                if (locals.existingUser) return next();

                console.log('[auth.confirm] - Searching for existing users via [' + locals.authUser.email + '] email address...');
                console.log('------------------------------------------------------------');

                const query = User.model.findOne();
                query.where('email', locals.form.email);
                query.exec(function (err, user) {
                    if (err) {
                        console.log('[auth.confirm] - Error finding existing user via email.', err);
                        console.log('------------------------------------------------------------');
                        return next(new Error('Sorry, there was an error processing your information, please try again.'));
                    }
                    if (user) {
                        console.log('[auth.confirm] - Found existing user via email address...');
                        console.log('------------------------------------------------------------');
                        return next(new Error('There\'s already an account with that email address, please sign-in instead.'));
                    }
                    return next();
                });

            },

            // Create or update user
            function (next) {

                if (locals.existingUser) {

                    console.log('[auth.confirm] - Existing user found, updating...');
                    console.log('------------------------------------------------------------');

                    const userData = {
                        state: 'enabled',

                        website: locals.form.website,

                        isVerified: true,

                        services: locals.existingUser.services || {}
                    };

                    _.extend(userData.services[locals.authUser.type], {
                        isConfigured: true,

                        profileId: locals.authUser.profileId,

                        username: locals.authUser.username,
                        avatar: locals.authUser.avatar,

                        accessToken: locals.authUser.accessToken,
                        refreshToken: locals.authUser.refreshToken
                    });

                    // console.log('[auth.confirm] - Existing user data:', userData);

                    locals.existingUser.set(userData);

                    locals.existingUser.save(function (err) {
                        if (err) {
                            console.log('[auth.confirm] - Error saving existing user.', err);
                            console.log('------------------------------------------------------------');
                            return next(new Error('Sorry, there was an error processing your account, please try again.'));
                        }
                        console.log('[auth.confirm] - Saved existing user.');
                        console.log('------------------------------------------------------------');
                        return next();
                    });

                } else {

                    console.log('[auth.confirm] - Creating new user...');
                    console.log('------------------------------------------------------------');

                    const userData = {
                        name: {
                            first: locals.form['name.first'],
                            last: locals.form['name.last']
                        },
                        email: locals.form.email,
                        password: Math.random().toString(36).slice(-8),

                        state: 'enabled',

                        website: locals.form.website,

                        isVerified: true,

                        services: {}
                    };

                    userData.services[locals.authUser.type] = {
                        isConfigured: true,

                        profileId: locals.authUser.profileId,

                        username: locals.authUser.username,
                        avatar: locals.authUser.avatar,

                        accessToken: locals.authUser.accessToken,
                        refreshToken: locals.authUser.refreshToken
                    };

                    // console.log('[auth.confirm] - New user data:', userData );

                    locals.existingUser = new User.model(userData);

                    locals.existingUser.save(function (err) {
                        if (err) {
                            console.log('[auth.confirm] - Error saving new user.', err);
                            console.log('------------------------------------------------------------');
                            return next(new Error('Sorry, there was an error processing your account, please try again.'));
                        }
                        console.log('[auth.confirm] - Saved new user.');
                        console.log('------------------------------------------------------------');
                        return next();
                    });

                }

            },

            // Session
            function () {
                if (req.user) {
                    console.log('[auth.confirm] - Already signed in, skipping sign in.');
                    console.log('------------------------------------------------------------');
                    return res.redirect(req.cookies.target || '/me');
                }
                return doSignIn();
            }

        ], function (err: Error) {
            if (err) {
                console.log('[auth.confirm] - Issue signing user in.', err);
                console.log('------------------------------------------------------------');
                req.flash('error', err.message || 'Sorry, there was an issue signing you in, please try again.');
                return res.redirect('/signin');
            }
        });

    };

    view.on('init', function (next) {
        return checkExisting(next);
    });

    view.on('post', { action: 'confirm.details' }, function (next) {
        if (!locals.form['name.first'] || !locals.form['name.last'] || !locals.form.email) {
            req.flash('error', 'Please enter a name & email.');
            return next();
        }
        return checkAuth();
    });

    view.render('auth/confirm');

};
