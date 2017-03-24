module.exports = {
  version: 1,
  resources: [

    {
      method: 'GET',
      description: 'Returns current user data',
      handler: function (req, callback) {
        callback(null, {email: 'mock.user@example.com', name: 'Mock', surname: 'User'});
      }
    },

    {
      method: 'GET',
      uri: ':id',
      validator: function (req) {
        req.assert('id').notEmpty().isNumeric();
      },
      handler: function (req, callback) {
        callback(null, {email: 'mock.user@example.com', name: 'Mock', surname: 'User', id: req.params.id});
      }
    },

    {
      method: 'PUT',
      uri: ':id',
      validator: function (req) {
        req.assert('id').notEmpty().isNumeric();
      },
      handler: function (req, callback) {
        callback(null, {updated: req.params.id, withData: req.body});
      }
    },

    {
      method: 'POST',
      noAuth: true,
      handler: function (req, callback) {
        callback(null, {created: req.body});
      }
    }

  ]
};