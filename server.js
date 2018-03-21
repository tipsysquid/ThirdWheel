//=================
// SETUP
// ================

//IMPORT MODULES
var http = require('http'); // create server with http module
var express = require('express'); //handle routing and server details
var bodyParser = require('body-parser'); //body paring middleware
var Q = require('q');
var config = require('./config/config.local.js');
var db_conf = config.db;
var db;
const MongoClient = require('mongodb').MongoClient;

var app = express();
var port = 3000;

app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({extended : true}));



app.get('/', function(req, res){
    res.json({"message": "Ready."});
});

MongoClient.connect(db_conf.url, (err, client) => {
    if(err){
        if(err.name == 'MongoNetworkError'){
            console.log("Are you sure mongodb is running?");
        }
        return console.log(err);
    }
    db = client.db('app'); 

       


    http.createServer(app).listen(port, function(){
        console.log("Server on port "+port);
        testWriteMongo();
        testReadMongo();
    });
});

/**
 * Quick function to test that mongo is connected
 * and it prints one of the documents saved
 */
function testReadMongo(){
    db.collection('users').find()
    .toArray(function(err, results){
        console.log(results);
    });     
}

function testWriteMongo(){
    db.collection('users').save({
        'name':'test',
        'email':'test@test.com',
        'password':'notsecure'
    }, (err, result) => {
        if(err){
            return console.log(err);
        }
        console.log('saved to database');
    });
}