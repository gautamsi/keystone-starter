import * as _ from 'lodash';
import * as async from 'async';
import * as keystone from 'keystone';
import * as passport from 'passport';
import { OAuth2Strategy as passportGoogleStrategy } from 'passport-google-oauth';
const User = keystone.list('User');

const credentials = {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,

    scope: 'profile email'
};

export function authenticateUser(req, res, next) {
    const self = this;

    let redirect = '/auth/confirm';
    if (req.cookies.target && req.cookies.target == 'app') redirect = '/auth/app';

    // Begin process
    console.log('============================================================');
    console.log('[services.google] - Triggered authentication process...');
    console.log('------------------------------------------------------------');

    // Initalise Google credentials
    const googleStrategy = new passportGoogleStrategy(credentials, function (accessToken, refreshToken, profile, done) {
        done(null, {
            accessToken: accessToken,
            refreshToken: refreshToken,
            profile: profile
        });
    });

    // Pass through authentication to passport
    passport.use(googleStrategy);

    // Save user data once returning from Google
    if (_.has(req.query, 'cb')) {

        console.log('[services.google] - Callback workflow detected, attempting to process data...');
        console.log('------------------------------------------------------------');

        passport.authenticate('google', { session: false }, function (err, data, info) {

            if (err || !data) {
                console.log('[services.google] - Error retrieving Google account data - ' + JSON.stringify(err));
                return res.redirect('/signin');
            }

            console.log('[services.google] - Successfully retrieved Google account data, processing...');
            console.log('------------------------------------------------------------');

            const auth = {
                type: 'google',

                name: {
                    first: data.profile.name.givenName,
                    last: data.profile.name.familyName
                },

                email: data.profile.emails.length ? _.first<{ value: string }>(data.profile.emails).value : null,

                website: data.profile._json.blog,

                profileId: data.profile.id,

                username: data.profile.username,
                avatar: data.profile._json.picture,

                accessToken: data.accessToken,
                refreshToken: data.refreshToken
            };

            req.session.auth = auth;

            return res.redirect(redirect);

        })(req, res, next);

        // Perform inital authentication request to Google
    } else {

        console.log('[services.google] - Authentication workflow detected, attempting to request access...');
        console.log('------------------------------------------------------------');

        passport.authenticate('google', <any>{ accessType: 'offline' })(req, res, next); // approvalPrompt: 'force'

    }

}
