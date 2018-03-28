const crypto = require('crypto');
var Q = require('q');
var mongoose = require('mongoose');
var Account = mongoose.model('Account');
const server_token = '662fc8d3-1067-46e2-a28d-c52900e76078';


exports.create = function(req, res, callback){
    var deferred = Q.defer();
    if(!req.body){
        deferred.reject(
            res.status(400).send({message:"No account data"})
        );
    }

    if(!req.body.email){
        deferred.reject(
            res.status(400).send({message:"Email address required"})
        );
    }
    if(!req.body.password){
        deferred.reject(
            res.status(400).send({message:"Password required to create an account"})
        );
    }

    var client_password = req.body.password;
    var client_email = req.body.email;

    //begin creating salt for password hashing
    createSaltBuffer()
    .then(function(buffer){
        var inner_deferred = Q.defer();
        var salt = buffer.toString('hex');
        if(salt){
            inner_deferred.resolve(salt);
        }
        else{
            inner_deferred.reject("salt invalid object type");
        }  
        return inner_deferred.promise;
    })
    .then(function(salt){
        //now that we have created our salt, lets use it to create
        //a secure hash
        var inner_deferred = Q.defer();
        hashPassword(salt, client_password)
        .then(function(password_data){
            var account = new Account({
                email: client_email,
                password: password_data.hashed_password,
                salt:password_data.salt,
                created_at:(new Date()).toUTCString()
            });
            inner_deferred.resolve(account);
        })
        .catch(function(ex){
           inner_deferred.reject(ex);
        });
        
        return inner_deferred.promise;
    })
    .then(function(account){
        var inner_deferred = Q.defer();

        account.save(account)
        .then(function(saved_account){
            console.log("created account!");
            inner_deferred.resolve(saved_account);
        })
        .catch(function(ex){
            inner_deferred.reject(ex);

        });
        return inner_deferred.promise;    
        
    })
    .then(function(saved_account){
        delete saved_account.salt;
        var res_account = {
            email:saved_account.email,
            created_at:saved_account.created_at
        };
        deferred.resolve(res.status(200).send(res_account));
    })
    .catch(function(ex){
        if(+(ex.code) == 11000){
            deferred.reject(
                res.status(500).send({message: "Your email address already has an account."})
            );
            console.log("Email address already exists");
            /*
            For some reason after this error scenario,
            I'm getting debug output feedback printing [object Object]
            I do not know where it is being emitted from at this time
            */
        }
        else{
            deferred.reject(
                res.status(500).send({message: "Error creating account. Please check logs"})
            );
            //console.log(ex);
        }
    });
    
    deferred.promise.nodeify(callback);
    return deferred.promise;
};

exports.login = function(req, res, callback){
    var deferred = Q.defer();

    if(!req.body){
        deferred.reject(
             res.status(400).send({message:"No account data"})
        );
    }
    if(!req.body.email){
        deferred.reject(
            res.status(400).send({message:"Email address required"})
        )
    }
    if(!req.body.password){
        deferred.reject(
            res.status(400).send({message:"Password required"})
        );
    }

    var client_password = req.body.password;
    var client_email = req.body.email;

    findAccount(client_email)
    .then(function(saved_account){
        var inner_deferred = Q.defer();
        //TODO we need more logic gates here, but it is okay for now
        if(saved_account.length > 1){
            inner_deferred.reject(
                res.status(500).send({message:"Too many accounts with this email address"})
            );
        }
        else{
            cryptoCompare(saved_account[0], client_password)
            .then(function(isAuth){
                if(req.server_token && req.server_token == server_token){
                    inner_deferred.resolve(saved_account[0]);
                }
                else{
                    inner_deferred.resolve(
                        res.status(200).send({message:"Login Success!"})
                    );
                }

            })
            .catch(function(ex){
                inner_deferred.reject(
                    res.status(400).send({message:"Login Failed."})
                );
            });
        }
        return inner_deferred.promise;
    })
    .then(function(login){
        deferred.resolve(login);
    })
    .catch(function(ex){
        deferred.reject(ex);
    });


    deferred.promise.nodeify(callback);
    return deferred.promise;
};

/**
 * Takes salt and a password from the client 
 *  hashes the password with the salt
 * @param {*} salt 
 * @param {*} password client provided password
 * 
 */
function hashPassword(salt, client_password, callback){
    var deferred = Q.defer();

    try
        {
            if(salt){
                var salted_pass = client_password + salt;
                var hashed_password = crypto.createHash('sha256').update(salted_pass).digest('hex'); 
                var password_data = {
                    salt : salt,
                    hashed_password: hashed_password
                };
                deferred.resolve(password_data);
            }
            else{
                deferred.reject("salt invalid object type");
            }  

    }
    catch(ex){
        console.log(ex);
        deferred.reject(ex);
    }

    deferred.promise.nodeify(callback);
    return deferred.promise;
    
}

/**
 * Using the crypto library,
 * we create salt for hashing passwords
 * @param {*} callback 
 */
function createSaltBuffer(callback){
    var deferred = Q.defer();

    try{    
        var cryptoCall = Q.denodeify(crypto.randomBytes);
        var buffer = cryptoCall(256);
    }
    catch(ex){
        console.log(ex);
        deferred.reject(ex);
    }

    deferred.resolve(buffer);
    deferred.promise.nodeify(callback);
    return deferred.promise;
}

function findAccount(email, callback){
    var deferred = Q.defer();

    var account = new Account({
        email:email
    });
    
    Account.find({email:email})
    .then(function(saved_account){
        var inner_deferred = Q.defer();
        inner_deferred.resolve(saved_account);
        return inner_deferred.promise;
    })
    .then(function(saved_account){
        deferred.resolve(saved_account);
    })
    .catch(function(ex){
        deferred.reject(ex);
    });

    deferred.promise.nodeify(callback);
    return deferred.promise;
}

function cryptoCompare(saved_account, client_password, callback){
    var deferred = Q.defer();
    if(saved_account && saved_account.salt){
        hashPassword(saved_account.salt, client_password)
        .then(function(password_data){
            var inner_deferred = Q.defer();
            var password_buf = Buffer.from(saved_account.password, 'utf-8');
            var hashed_pass_buf = Buffer.from(password_data.hashed_password, 'utf-8');
            var equal = crypto.timingSafeEqual(password_buf, hashed_pass_buf);
            if(equal){
                inner_deferred.resolve(equal);
            }
            else{
                inner_deferred.reject(equal);
            }
            return inner_deferred.promise;
        })
        .then(function(equal){
            deferred.resolve(equal);
        })
        .catch(function(err){
            deferred.reject(err);
        });
    }
    else{
        deferred.reject({message:"Your account is broken"});
    }
    deferred.promise.nodeify(callback);
    return deferred.promise;
}