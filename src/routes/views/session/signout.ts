import * as keystone from 'keystone';

export = function (req, res) {

    const view = new keystone.View(req, res),
        locals = res.locals;

    locals.section = 'session';

    keystone.session.signout(req, res, function () {
        res.redirect('/');
    });

};
