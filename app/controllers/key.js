const crypto = require('crypto');
const assert = require('assert');
var Q = require('q');
var mongoose = require('mongoose');
var Key = mongoose.model('Key');
var account = require('../controllers/account.js');
const server_token = '662fc8d3-1067-46e2-a28d-c52900e76078';

/**
 * Authenticates a user by email and password,
 * then on the key field accepts a string as a key for a user's account.
 * This key will be used to verify messages later.
 * @param {*} req 
 * @param {*} res 
 * @param {*} callback 
 */
exports.addKey = function(req, res, callback){
    var deferred = Q.defer();
    var client_obs;

    verifyAddKeyInputs(req, res)
    .then(function(verified){
        client_obs = {
            client_email:req.body.email,
            client_key:req.body.key
        };
        return;
    })
    .then(function(client_obs){
        var inner_deferred = Q.defer();
        req.server_token = server_token;
        authAccount(req, res)
        .then(function(saved_account){
            inner_deferred.resolve(saved_account);
        })
        .catch(function(ex){
            inner_deferred.reject(ex);
        });
        return inner_deferred.promise;
    })
    .then(function(saved_account){
        var inner_deferred = Q.defer();
        saveKey(saved_account, client_obs)
        .then(function(saved_key){
            inner_deferred.resolve(saved_key);
        })
        .catch(function(ex){
            inner_deferred.reject(ex);
        });
        return inner_deferred.promise;
    })
    .then(function(saved_key){
        deferred.resolve(
            res.status(200).send({message:'Your key has been saved'})
        );
    })
    .catch(function(ex){
        deferred.reject(
            res.status(400).send({message:'Your key was not saved'})
        );
    });

    deferred.promise.nodeify(callback);
    return deferred.promise;
}

/**
 * This function accepts a signed message 
 * and returns a boolean on whether or not 
 * a particular email address owns the 
 * given public key.
 * This function works much like a
 * privacy focused 
 * password authentication function
 * in that it will not reveal whether or not 
 * a particular email is valid.
 * @param {} req 
 * @param {*} res 
 * @param {*} callback 
 */
exports.verifyMessage = function(req, res, callback){
    var deferred = Q.defer();
    const message = req.body.message;
    var svd_acc;


    /**
     * Skipping some essential validation for now
     *
     */

    //first confirm that this email address exists via login 
    //account.findAccount
    authAccount(req, res)
    .then(function(saved_account){
        //the account is valid, retrieve the key belonging to the account       
        var inner_deferred = Q.defer();
        retrieveKey(saved_account)
        .then(function(saved_key){
            var accun
            inner_deferred.resolve(saved_key);
        })
        .catch(function(ex){
            inner_deferred.reject(ex);
        })
        return inner_deferred.promise
    })
    .then(function(saved_key){
    
        var inner_deferred = Q.defer();
        verification(saved_key,message)
        .then(function(verification){
            inner_deferred.resolve(verification);
        })
        .catch(function(ex){
            inner_deferred.reject(ex);
        });
        return inner_deferred.promise;
    })
    .then(function(verification){
        var status = {
            message: message,
            key: svd_acc.key,
            verification:verification
        };

        deferred.resolve(
            res.status(200).send(status)
        );
    })
    .catch(function(ex){
        deferred.reject(
            res.status(400).send(ex)
        );
    });
    

    deferred.promise.nodeify(callback);
    return deferred.promise;
}

/**
 * WIP.
 * Want to be able to create a key here to use for adding a key later.
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} callback 
 */
exports.createKey = function(req, res, callback){
    var deferred = Q.defer();

    /**
     * My idea was that I wanted to be able to generate 
     * type equivalent keys.
     * What type of public key are we working with?
     * 
     * partially related: can we create a reproducable 
     * keypair based on a seed?
     */
    try{
        crypto.pbkdf2('secret','salt', 100000, 64, 'sha512', 
        (err, derived_key) => {
            var inner_deferred = Q.defer();
            if(err) inner_deferred.reject(err);
            //deferred.resolve(derived_key);
            const dh = crypto.createDiffieHellman(derived_key);
            const keys = dh.generateKeys();
            const priv_key = dh.getPrivateKey();
            const pub_key = dh.getPublicKey();
            return inner_deferred.promise;
        });
    }
    catch(ex){
        deferred.reject(
            res.status(400).send({message:"Unable to create key"})
        )
    }
 

    deferred.promise.nodeify(callback);
    return deferred.promise;
}

/**
 * Using the crypto DiffieHellman, create a public private key pair.
 * Save the public key to the database. Return the private key to the user. 
 * @param {} req 
 * @param {*} res 
 * @param {*} callback 
 */
exports.createKeyV2 = function(req, res, callback){
    var deferred = Q.defer();
    var auth_account;
    var generated_keys;
    //skipping verifying if info is there. 

    authAccount(req,res)
    .then(function(auth_acc){
        auth_account = auth_acc;
        try{
            const dh = crypto.createDiffieHellman(128);
            console.log('created diffiehellmen');
            return dh;
        }
        catch(ex){
            console.log(ex);
            deferred.reject(res.status(500).send('Unable to create key'));
        }
        
    })
    .then(function(dh){
        //generateKeys() should return the public key as a buffer
        const pub_key = dh.generateKeys();
        const priv_key = dh.getPrivateKey('hex');
        const keys = {
            pub_key:pub_key,
            priv_key:priv_key
        };
        delete pub_key, priv_key;
        //return the pub_key and priv_key
        return keys;
    })
    .then(function(keys){
        /*Let's save our public key.
        Once we save the pub_key of the user
        we will return the priv key for the user to safe guard.
        */
       generated_keys = keys;
       delete keys;
       var inner_deferred = Q.defer();
       try{
        saveKey(auth_account,keys.pub_key)
        .then(function(saved_key){
            inner_deferred.resolve(saved_key);
        })
        .catch(function(ex){
            inner_deferred.reject(ex);
        });
       }
       catch(ex){
           inner_deferred.reject(ex);
       }
      
       return inner_deferred.promsise;

    })
    .then(function(saved_key){
        deferred.resolve(
            res.status(200).send({
                message:'This is your private key, carefully secure it. This is the only copy.',
                priv_key:generated_keys.priv_key
            })
        );
    })
    .catch(function(ex){
        deferred.reject(res.status(400).send(ex));
    })
    .finally(function(end){
        delete generated_keys;
    });
    

    deferred.promise.nodeify(callback);
    return deferred.promise;
}

/**
 * Authenticate the account credentials 
 * before we release details about the existence of a key.
 * @param {} req 
 * @param {*} res 
 * @param {*} callback 
 */
function authAccount(req, res, callback){
    var deferred = Q.defer();
    req.server_token = server_token;
    account.login(req, res)
    .then(function(saved_account){
        var inner_deferred = Q.defer();
        if(saved_account){
            inner_deferred.resolve(saved_account);
        }
        else{
            inner_deferred.reject({message:'No account found'});
        }
        return inner_deferred.promise;
    })
    .then(function(res){
        deferred.resolve(res);
    })
    .catch(function(ex){
        deferred.reject(ex);
    });

    deferred.promise.nodeify(callback);
    return deferred.promise;
}

/**
 * email, password, key
 * @param {*} req 
 * @param {*} res 
 * @param {*} callback 
 */
function verifyAddKeyInputs(req, res, callback){
    var deferred = Q.defer();
    if(!req.body){
        deferred.reject(
            res.status(400).send({message:"No data"})
        );
    }
    else{
        if(!req.body.email){
            deferred.reject(
                res.status(400).send({message:"You must provide an email"})
            );
        }
        else{
            if(!req.body.password){
                deferred.reject(
                    res.status(400).send({message:"You must provide your password"})
                );
            }
            else{
                if(!req.body.key){
                    deferred.reject(
                        res.status(400).send({message:"Key cannot be empty"})
                    );
                }
                else{
                    deferred.resolve({});
                }
            }
        }
    }
    deferred.promise.nodeify(callback);
    return deferred.promise;
}

/**
 * Using the mongoose key model,
 * save a Key document to the database.
 * Returns the key obj.
 * @param {*} auth_account 
 * @param {Buffer} key 
 */
function saveKey(auth_account, key, callback){
    var deferred = Q.defer();

    var key = new Key({
        account:auth_account,
        key:new Buffer(key),
        created_at:(new Date()).toUTCString()
    });
    key.save(key)
    .then(function(saved_key){
        console.log("created key!");
        deferred.resolve(saved_key);
    })
    .catch(function(ex){
        deferred.reject(JSON.stringify(ex));
    });

    deferred.promise.nodeify(callback);
    return deferred.promise;
}
/**
 * WIP
 * Be able to verify that a particular message
 * is signed by a specific user.
 * @param {*} key 
 * @param {*} message 
 * @param {*} callback 
 */
function verification(key, message, callback){
    var deferred = Q.defer();

    var verifier = crypto.createVerify('sha256');
    verifier.update(message);

    //Updates the verifier object with data.
    const verified = verifier.verify(message, key);
    deferred.resolve(verified);

    deferred.promise.nodeify(callback);
    return deferred.promise;
}

/**
 * Find the key belonging to the account
 * in which you wish to verify a message for 
 * @param {*} saved_account 
 * @param {*} callback 
 */
function retrieveKey(saved_account, callback){
    var deferred = Q.defer();

    Key.find({account:saved_account})
    .then(function(key_account){
        //take the 0th of the array
        deferred.resolve(key_account[0].key);
    })
    .catch(function(ex){
        deferred.reject(ex);
    });

    deferred.promise.nodeify(callback);
    return deferred.promise;
}