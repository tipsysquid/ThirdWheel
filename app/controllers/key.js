const crypto = require('crypto');
var Q = require('q');
var mongoose = require('mongoose');
var Key = mongoose.model('Key');
var account = require('../controllers/account.js');
const server_token = '662fc8d3-1067-46e2-a28d-c52900e76078';

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
 * 
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} callback 
 */
exports.createKey = function(req, res, callback){
    var deferred = Q.defer();

    //
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

    deferred.promise.nodeify(callback);
    return deferred.promise;
}

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
 * 
 * @param {*} auth_account 
 * @param {*} client_obs 
 */
function saveKey(auth_account, client_obs, callback){
    var deferred = Q.defer();

    var key = new Key({
        account:auth_account,
        key:client_obs.client_key,
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