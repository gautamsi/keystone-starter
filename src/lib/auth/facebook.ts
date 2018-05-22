import * as _ from 'lodash';
import * as async from 'async';
import * as keystone from 'keystone';
import * as passport from 'passport';
import { Strategy as passportFacebookStrategy } from 'passport-facebook';
const User = keystone.list('User');

const credentials = {
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL,
    profileFields: []
};

if (process.env.FACEBOOK_API >= 2.4) {
    credentials.profileFields = ['id', 'birthday', 'email', 'first_name', 'gender', 'last_name', 'displayName'];
}

export function authenticateUser(req, res, next) {
    const self = this;

    let redirect = '/auth/confirm';
    if (req.cookies.target && req.cookies.target == 'app') redirect = '/auth/app';

    // Begin process
    console.log('============================================================');
    console.log('[services.facebook] - Triggered authentication process...');
    console.log('------------------------------------------------------------');

    // Initalise Facebook credentials
    const facebookStrategy = new passportFacebookStrategy(credentials, function (accessToken, refreshToken, profile, done) {
        done(null, {
            accessToken: accessToken,
            refreshToken: refreshToken,
            profile: profile
        });
    });

    // Pass through authentication to passport
    passport.use(facebookStrategy);

    // Save user data once returning from Facebook
    if (_.has(req.query, 'cb')) {

        console.log('[services.facebook] - Callback workflow detected, attempting to process data...');
        console.log('------------------------------------------------------------');

        passport.authenticate('facebook', { session: false }, function (err, data, info) {

            if (err || !data) {
                console.log('[services.facebook] - Error retrieving Facebook account data - ' + JSON.stringify(err));
                return res.redirect('/signin');
            }

            console.log('[services.facebook] - Successfully retrieved Facebook account data, processing...');
            console.log('------------------------------------------------------------');

            const name = data.profile && data.profile.displayName ? data.profile.displayName.split(' ') : [];

            const auth = {
                type: 'facebook',

                name: {
                    first: name.length ? name[0] : '',
                    last: name.length > 1 ? name[1] : ''
                },

                email: data.profile.emails && data.profile.emails.length ? _.first<{ value: string }>(data.profile.emails).value : null,

                website: data.profile._json.blog,

                profileId: data.profile.id,

                username: data.profile.username,
                avatar: 'https://graph.facebook.com/' + data.profile.id + '/picture?width=600&height=600',

                accessToken: data.accessToken,
                refreshToken: data.refreshToken
            };

            req.session.auth = auth;

            return res.redirect(redirect);

        })(req, res, next);

        // Perform inital authentication request to Facebook
    } else {

        console.log('[services.facebook] - Authentication workflow detected, attempting to request access...');
        console.log('------------------------------------------------------------');

        passport.authenticate('facebook', { scope: ['email'] })(req, res, next);

    }

}
