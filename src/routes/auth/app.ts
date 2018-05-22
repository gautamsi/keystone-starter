import * as keystone from 'keystone';

export = function (req, res) {

    const view = new keystone.View(req, res),
        locals = res.locals;

    locals.authUser = req.session.auth;

    view.render('auth/app');

};
