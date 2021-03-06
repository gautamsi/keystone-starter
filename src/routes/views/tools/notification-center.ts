import * as keystone from 'keystone';
import * as Email from 'keystone-email';
import * as async from 'async';

// const Meetup = keystone.list("Meetup");
const User = keystone.list('User');

export = function (req, res) {

    const view = new keystone.View(req, res),
        locals = res.locals;

    locals.section = 'tools';
    // locals.nextMeetup = false;


    // Keep it secret, keep it safe

    if (!req.user || req.user && !req.user.isAdmin) {
        console.warn('===== ALERT =====');
        console.warn('===== A non-admin attempted to access the Notification Center =====');
        return res.redirect('/');
    }


    // Get all subscribers

    view.query('subscribers', User.model.find().where('notifications.meetups', true));


    // Get the next meetup

    // view.on("init", function (next) {
    //     Meetup.model.findOne()
    //         .where("state", "active")
    //         .sort("-startDate")
    //         .exec(function (err, meetup) {

    //             if (err) {
    //                 console.error("===== Error loading next meetup =====");
    //                 console.error(err);
    //                 return next();
    //             } else if (!meetup) {
    //                 req.flash("warning", 'There isn\'t a "next" meetup at the moment');
    //                 return next();
    //             } else {
    //                 locals.nextMeetup = meetup;
    //                 next();
    //             }

    //         });
    // });


    // Notify next meetup attendees

    view.on('post', { action: 'notify.attendee' }, function (next) {
        if (!locals.nextMeetup) {
            req.flash('warning', 'There isn\'t a "next" meetup at the moment');
            return next();
        } else {
            locals.nextMeetup.notifyAttendees(req, res, function (err) {
                if (err) {
                    req.flash('error', 'There was an error sending the notifications, please check the logs for more info.');
                    console.error('===== Failed to send meetup notification emails =====');
                    console.error(err);
                } else {
                    req.flash('success', 'Notification sent to ' + keystone.utils.plural(locals.nextMeetup.rsvps.length, '* attendee'));
                }
                next();
            });
        }
    });


    // Notify all keystone-starter subscribers

    view.on('post', { action: 'notify.subscriber' }, function (next) {
        if (!locals.subscribers) {
            req.flash('warning', "There aren't any subscribers at the moment");
            return next();
        } else {
            async.each(locals.subscribers, function (subscriber: any, doneSubscriber) {
                new Email('member-notification', { transport: 'mandrill', engine: 'pug', root: 'templates/emails' }).send({
                    subscriber: subscriber,
                    content: req.body.subscriber_email_content,
                    link_label: req.body.subscriber_email_link_label,
                    link_url: req.body.subscriber_email_link_url,
                    host: 'http://www.keystone-starter.com',
                }, {
                    subject: req.body.subscriber_email_subject || 'Notification from keystone-starter',
                    to: subscriber.email,
                    from: {
                        name: 'keystone-starter',
                        email: 'hello@keystone-starter.com'
                    }
                }, doneSubscriber);
            }, function (err) {
                if (err) {
                    req.flash('error', 'There was an error sending the emails, please check the logs for more info.');
                    console.error('===== Failed to send subscriber emails =====');
                    console.error(err);
                } else {
                    req.flash('success', 'Email sent to ' + keystone.utils.plural(locals.subscribers.length, '* subscriber'));
                }
                next();
            });
        }
    });


    // Populate the RSVPs for counting

    view.on('render', function (next) {
        if (locals.nextMeetup) {
            locals.nextMeetup.populateRelated('rsvps', next);
        } else {
            next();
        }

    });

    view.render('tools/notification-center');

};
