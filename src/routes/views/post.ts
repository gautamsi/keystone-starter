import * as keystone from 'keystone';

export = function (req, res) {

      const view = new keystone.View(req, res);
      const locals = res.locals;

      // Set locals
      locals.section = 'blog';
      locals.filters = {
            post: req.params.post,
      };
      locals.data = {
            posts: [],
      };

      // Load the current post
      view.on('init', function (next) {

            const q = keystone.list('Post').model.findOne({
                  state: 'published',
                  slug: locals.filters.post,
            }).populate('author categories');

            q.exec(function (err, result) {
                  locals.data.post = result;
                  next(err);
            });

      });

      // Load other posts
      view.on('init', function (next) {

            const q = keystone.list('Post').model.find().where('state', 'published').sort('-publishedDate').populate('author').limit(4);

            q.exec(function (err, results) {
                  locals.data.posts = results;
                  next(err);
            });

      });

      // Render the view
      view.render('post');
};
