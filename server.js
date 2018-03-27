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


MongoClient.connect(db_conf.url)
.then(function(client){
    db = client.db('app');
    http.createServer(app).listen(port, function(){
        console.log("Server on port: "+port);
        if(debug){
            tests()
            .then(function(res){
                console.log("Tests completed: Success");
            })
            .catch(function(exception){
                console.log("Tests completed: Failure");
            });
        }
    });
})
.catch(function(exception){
    if(exception.name == 'MongoNetworkError'){
        console.log("Are you sure mongodb is running?");
    }
    return console.log(exception); 
});

/**
 * Quick function to test that mongo is connected
 * and it prints one of the documents saved
 */
function testReadMongo(lookup,callback){
    var deferred = Q.defer();
    
    db.collection('users').find(lookup).toArray()
    .then(function(res){
        console.log("find from database");
        deferred.resolve(res);
    })
    .catch(function(exception){
        console.log(exception);
        deferred.reject(exception);
    })
    
    deferred.promise.nodeify(callback);
    return deferred.promise;     
}

/**
 * Simple test to insertOne into Mongodb
 * @param {data to write} testdata 
 * @param {*} callback 
 */
function testWriteMongo(testdata,callback){
    var deferred = Q.defer();
    db.collection('users').insertOne(testdata)
    .then(function(res){
        console.log("insertOne to database");
        deferred.resolve(res);
    })
    .catch(function(exception){
        console.log(exception);
        deferred.reject(exception);
    });
    deferred.promise.nodeify(callback);
    return deferred.promise;
}

/**
 * Test function
 * @param {} callback 
 */
function tests(callback){
    var deferred = Q.defer();

    if(debug){
        testWriteMongo(testdata)
        .then(function(res){
            var inner_deferred = Q.defer();
            console.log("Successfully wrote to db");
            testReadMongo(testdata)
            .then(function(res){
                console.log("Sucessfully read from db");
                inner_deferred.resolve(res);
            })
            .fail(function(err){
                inner_deferred.reject(err);
            });
            return inner_deferred.promise;
        })
        .fail(function(err){
            deferred.reject(err);
        })
        .finally(function(){
            deferred.resolve();
        });
    }
    deferred.promise.nodeify(callback);
    return deferred.promise;

}