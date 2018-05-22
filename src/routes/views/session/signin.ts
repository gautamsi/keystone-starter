import * as keystone from 'keystone';
import * as async from 'async';

export = function (req, res) {

    if (req.user) {
        return res.redirect(req.cookies.target || '/me');
    }

    const view = new keystone.View(req, res),
        locals = res.locals;

    locals.section = 'session';
    locals.form = req.body;

    view.on('post', { action: 'signin' }, function (next) {

        if (!req.body.email || !req.body.password) {
            req.flash('error', 'Please enter your username and password.');
            return next();
        }

        const onSuccess = function () {
            if (req.body.target && !/signup|signin/.test(req.body.target)) {
                console.log('[signin] - Set target as [' + req.body.target + '].');
                res.redirect(req.body.target);
            } else {
                res.redirect('/me');
            }
        };

        const onFail = function () {
            req.flash('error', 'Your username or password were incorrect, please try again.');
            return next();
        };

        keystone.session.signin({ email: req.body.email, password: req.body.password }, req, res, onSuccess, onFail);

    });

    view.render('session/signin');

};
