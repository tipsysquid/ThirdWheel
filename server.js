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
var debug = config.debug;

var app = express();
var port = 3000;

app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({extended : true}));

var testdata = {
    'name':'test',
    'email':'test@test.com',
    'password':'notsecure'
};


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
        var deferred = Q.defer();

        if(debug){
            testWriteMongo(testdata)
            .then(function(res){
                testReadMongo(testdata)
                .then(function(res){
                    console.log("Sucessfully read from db");
                    deferred.resolve(res);
                })
                .fail(function(err){
                    deferred.reject(err);
                });
            })
            .fail(function(err){
                deferred.reject(err);
            });
        }
        return deferred.promise;
    });

});

/**
 * Quick function to test that mongo is connected
 * and it prints one of the documents saved
 */
function testReadMongo(lookup,callback){
    var deferred = Q.defer();
    db.collection('users').find(lookup)
    .toArray(function(err,result){
        if(err){
            console.log(err);
            deferred.reject(err);
        }
        else{
            //console.log(result);
            deferred.resolve(result);
        }
    });

    // .toArray(function(err, results){
    //     if(err){
    //         console.log(err);
    //         deferred.reject(err);
    //     }
    //     else{
    //         console.log(results);
    //         deferred.resolve(results);
    //     }
    // });
    
    deferred.promise.nodeify(callback);
    return deferred.promise;     
}

function testWriteMongo(testdata,callback){
    var deferred = Q.defer();
    db.collection('users').save(testdata, (err, result) => {
        if(err){
            console.log(err);
            deferred.reject(err);
        }
        else{
            console.log("saved to database");
            deferred.resolve(result);
        }
    });
    deferred.promise.nodeify(callback);
    return deferred.promise;
}