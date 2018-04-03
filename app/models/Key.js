var mongoose = require('mongoose'); //for schema
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;


var KeySchema = new mongoose.Schema({
    account: {
        type: ObjectId,
        ref: "Account",
        required: true,
        trim: true,
        unique: true
    },
    key: {
        type: String,
        required: true
    },
    created_at: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Key', KeySchema);