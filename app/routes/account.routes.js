module.exports = function(app) {
    var Account = require('../models/Account.js');
    var accounts = require('../controllers/account.js');

    //create new account
    app.post('/accounts/create', accounts.create);

    //Login with existing account
    app.post('/login', accounts.login);

}