import * as keystone from 'keystone';
import * as moment from 'moment';

const User = keystone.list('User');

export = function (req, res) {

    const view = new keystone.View(req, res),
        locals = res.locals;

    locals.section = 'member';
    locals.moment = moment;


    // Load the Member

    view.on('init', function (next) {
        User.model.findOne()
            .where('key', req.params.member)
            .exec(function (err, member) {
                if (err) return res.err(err);
                if (!member) {
                    req.flash('info', "Sorry, we couldn't find a matching member");
                    return res.redirect('/');
                }
                locals.member = member;
                next();
            });
    });


    // Set the page title and populate related documents

    view.on('render', function (next) {
        if (locals.member) {
            locals.page.title = locals.member.name.full + ' - keystone-starter';
            // locals.member.populateRelated('posts talks[meetup]', next);
            next();
        }
    });

    view.render('site/member');

};
