import * as async from 'async';
import * as crypto from 'crypto';

import * as keystone from 'keystone';
import * as Email from 'keystone-email';
const Types = keystone.Field.Types;
/**
 * Users Model
 * ===========
 */

const User = new keystone.List('User', {
    track: true,
    autokey: { path: 'key', from: 'name', unique: true }
});

const deps = {
    // mentoring: { "mentoring.available": true },
    // github: { "services.github.isConfigured": true },
    facebook: { 'services.facebook.isConfigured': true },
    google: { 'services.google.isConfigured': true },
    twitter: { 'services.twitter.isConfigured': true }
};

User.add({
    name: { type: Types.Name, required: true, index: true },
    email: { type: Types.Email, initial: true, index: true },
    password: { type: Types.Password, initial: true },
    resetPasswordKey: { type: String, hidden: true }
},
    'Profile',
    {
        isPublic: { type: Boolean, default: true },
        isOrganiser: Boolean,
        isGroup: Boolean,
        // organisation: { type: Types.Relationship, ref: "Organisation", multiple: true },
        photo: { type: Types.CloudinaryImage },
        // github: { type: String, width: "short" },
        twitter: { type: String, width: 'short' },
        website: { type: Types.Url },
        bio: { type: Types.Markdown },
        gravatar: { type: String, noedit: true }
    }, 'Notifications', {
        notifications: {
            posts: { type: Boolean },
            events: { type: Boolean },
            places: { type: Boolean }
        }
        // }, "Mentoring", {
        //     mentoring: {
        //         available: { type: Boolean, label: "Is Available", index: true },
        //         free: { type: Boolean, label: "For Free", dependsOn: deps.mentoring },
        //         paid: { type: Boolean, label: "For Payment", dependsOn: deps.mentoring },
        //         swap: { type: Boolean, label: "For Swap", dependsOn: deps.mentoring },
        //         have: { type: String, label: "Has...", dependsOn: deps.mentoring },
        //         want: { type: String, label: "Wants...", dependsOn: deps.mentoring }
        //     }
    }, 'Permissions', {
        isAdmin: { type: Boolean, label: 'Can Admin This Site' },
        isVerified: { type: Boolean, label: 'Has a verified email address' }
    }, 'Services', {
        services: {
            // github: {
            //     isConfigured: { type: Boolean, label: "GitHub has been authenticated" },

            //     profileId: { type: String, label: "Profile ID", dependsOn: deps.github },

            //     username: { type: String, label: "Username", dependsOn: deps.github },
            //     avatar: { type: String, label: "Image", dependsOn: deps.github },

            //     accessToken: { type: String, label: "Access Token", dependsOn: deps.github },
            //     refreshToken: { type: String, label: "Refresh Token", dependsOn: deps.github }
            // },
            facebook: {
                isConfigured: { type: Boolean, label: 'Facebook has been authenticated' },

                profileId: { type: String, label: 'Profile ID', dependsOn: deps.facebook },

                username: { type: String, label: 'Username', dependsOn: deps.facebook },
                avatar: { type: String, label: 'Image', dependsOn: deps.facebook },

                accessToken: { type: String, label: 'Access Token', dependsOn: deps.facebook },
                refreshToken: { type: String, label: 'Refresh Token', dependsOn: deps.facebook }
            },
            google: {
                isConfigured: { type: Boolean, label: 'Google has been authenticated' },

                profileId: { type: String, label: 'Profile ID', dependsOn: deps.google },

                username: { type: String, label: 'Username', dependsOn: deps.google },
                avatar: { type: String, label: 'Image', dependsOn: deps.google },

                accessToken: { type: String, label: 'Access Token', dependsOn: deps.google },
                refreshToken: { type: String, label: 'Refresh Token', dependsOn: deps.google }
            },
            twitter: {
                isConfigured: { type: Boolean, label: 'Twitter has been authenticated' },

                profileId: { type: String, label: 'Profile ID', dependsOn: deps.twitter },

                username: { type: String, label: 'Username', dependsOn: deps.twitter },
                avatar: { type: String, label: 'Image', dependsOn: deps.twitter },

                accessToken: { type: String, label: 'Access Token', dependsOn: deps.twitter },
                refreshToken: { type: String, label: 'Refresh Token', dependsOn: deps.twitter }
            }
        }
    }, 'Meta', {
        postCount: { type: Number, default: 0, noedit: true },
        placeCount: { type: Date, noedit: true }
    });

/**
 * Pre-save
 * =============
 */
User.schema.pre('save', function (next) {
    const member = this;
    async.parallel([
        function (done) {
            if (!member.email) return done();
            member.gravatar = crypto.createHash('md5').update(member.email.toLowerCase().trim()).digest('hex');
            return done();
        },
        function (done) {
            keystone.list('Post').model.count({ author: member.id }).exec(function (err, count) {
                if (err) {
                    console.error('===== Error counting user posts =====');
                    console.error(err);
                    return done();
                }
                member.postCount = count;
                return done();
            });
        },
        // function (done) {
        //     keystone.list("EventRSVP").model.findOne({ attendee: member.id }).sort("changedAt").exec(function (err, rsvp) {
        //         if (err) {
        //             console.error("===== Error setting user last RSVP date =====");
        //             console.error(err);
        //             return done();
        //         }
        //         if (!rsvp) return done();
        //         member.lastRSVP = rsvp.changedAt;
        //         return done();
        //     });
        // }
    ], next);
});


/**
 * Relationships
 * =============
 */

User.relationship({ ref: 'Post', refPath: 'author', path: 'posts' });
// User.relationship({ ref: "EventSession", refPath: "speaker", path: "sessions" });
// User.relationship({ ref: "EventRSVP", refPath: "attendee", path: "rsvps" });


/**
 * Virtuals
 * ========
 */

// Link to member
User.schema.virtual('url').get(function () {
    return '/member/' + this.key;
});

// Provide access to Keystone
User.schema.virtual('canAccessKeystone').get(function () {
    return this.isAdmin;
});

// Pull out avatar image
User.schema.virtual('avatarUrl').get(function () {
    if (this.photo.exists) return this._.photo.thumbnail(120, 120);
    // if (this.services.github.isConfigured && this.services.github.avatar) return this.services.github.avatar;
    if (this.services.facebook.isConfigured && this.services.facebook.avatar) return this.services.facebook.avatar;
    if (this.services.google.isConfigured && this.services.google.avatar) return this.services.google.avatar;
    if (this.services.twitter.isConfigured && this.services.twitter.avatar) return this.services.twitter.avatar;
    if (this.gravatar) return 'https://www.gravatar.com/avatar/' + this.gravatar + '?d=mp&r=pg';
});

// Usernames
User.schema.virtual('twitterUsername').get(function () {
    return (this.services.twitter && this.services.twitter.isConfigured) ? this.services.twitter.username : '';
});
// User.schema.virtual("githubUsername").get(function () {
//     return (this.services.github && this.services.github.isConfigured) ? this.services.github.username : "";
// });


/**
 * Methods
 * =======
 */

User.schema.methods.resetPassword = function (callback) {
    const user = this;
    user.resetPasswordKey = keystone.utils.randomString([16, 24]);
    user.save(function (err) {
        if (err) return callback(err);
        new Email('forgotten-password', { transport: 'mandrill', engine: 'pug', root: 'templates/emails' }).send({
            user: user,
            link: '/reset-password/' + user.resetPasswordKey,
            host: 'http://www.keystone-starter.com',
        }, {
            subject: 'Reset your keystone-starter Password',
            to: user.email,
            from: {
                name: 'keystone-starter',
                email: 'contact@keystone-starter.com'
            }
        }, callback);
    });
};


/**
 * Registration
 * ============
 */

User.defaultColumns = 'name, email, twitter, isAdmin';
User.register();
