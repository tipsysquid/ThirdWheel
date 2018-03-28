var mongoose = require('mongoose'); //for schema


var AccountSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    salt : {
        type: String,
        required: true
    },
    created_at: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Account', AccountSchema);