module.exports = function(app) {
    var Key = require('../models/Key.js');
    var keys = require('../controllers/key.js');

    app.post('/key/add', keys.addKey);

    app.post('/key/create', keys.createKeyV2);

    app.post('/key/verisig', keys.verifyMessage);
}