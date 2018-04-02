//=================
// SETUP
// ================

//IMPORT MODULES
var http = require('http'); // create server with http module so that we can https later
var express = require('express'); //handle routing and server details
var bodyParser = require('body-parser'); //body paring middleware
var Q = require('q');
var config = require('./config/config.local.js');
var db_conf = config.db;
var db;
//const MongoClient = require('mongodb').MongoClient;
const mongoose = require('mongoose');

var debug = config.debug;

var app = express();
var port = 3000;

app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({extended : true}));

addRoutes()
.then(function(){
    startServer()
})
.catch(function(ex){
    console.log('ERROR');
    console.log(ex);
})


function addRoutes(callback){
    var deferred = Q.defer();
    require('./app/routes/account.routes.js')(app)
    require('./app/routes/key.routes.js')(app);
    
    deferred.resolve(console.log("Added Routes"));

    deferred.promise.nodeify(callback);
    return deferred.promise;
}

/**
 * Returns mongoose connection object
 */
function connectMongo(callback){
    var deferred = Q.defer();
    mongoose.connect(db_conf.url)
    .then(function(mongoose){
        var connection = mongoose.connection;
        console.log("Connected to MongoDb");
        deferred.resolve(connection);
    })
    .catch(function(ex){
        console.log("Unable to connect to mongo. Terminating.")
        deferred.reject(ex);
    });
    deferred.promise.nodeify(callback);
    return deferred.promise;
}

/**
 * Start our HTTP server, begin listening 
 * on the configured port,
 * then connect to our mongo instance with mongoose
 */
function startServer(callback){
    var deferred = Q.defer();
    http.createServer(app).listen(port, function(){
        connectMongo()
        .then(function(db){
            console.log("Server listening on port: "+port);
            deferred.resolve(db);
        })
        .catch(function(ex){
            console.log(ex);
            process.exit();
        });
    });
    deferred.promise.nodeify(callback);
    return deferred.promise;
}



/*==============================
========DEPRECATED==============
================================*/

/**
 * This was the original way I was connection
 * to my mongodb as I was refamiliarizing myself with mongo
 */
function oldServerConfig(){
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
        console.log(exception);
        process.exit(); 
    });
}

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