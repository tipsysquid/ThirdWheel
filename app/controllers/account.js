const crypto = require('crypto');
var Q = require('q');
var mongoose = require('mongoose');
var Account = mongoose.model('Account');


exports.create = function(req, res, callback){
    var deferred = Q.defer();
    if(!req.body){
        return res.status(400).send({message:"No account data"});
    }

    if(!req.body.email){
        return res.status(400).send({message:"Email address required"});
    }
    if(!req.body.password){
        return res.status(400).send({message:"Password required to create an account"});
    }
    hashPassword(req.body.password)
    .then(function(password_data){
        var account = new Account({
            email: req.body.email,
            password: password_data.hashedPassword,
            salt:password_data.salt,
            created_at:(new Date()).toUTCString()
        });
        return account;
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
        deferred.resolve(res.status(200).send(account));
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

exports.findOne = function(req, res){
    //find a single account
};

/**
 * Takes a raw password from the client 
 * Creates salt and then hashes the password with the salt
 * @param {*} password 
 */
function hashPassword(password,callback){
    var deferred = Q.defer();

    try{
        createSaltBuffer()
        .then(function(buffer){
            var salt = buffer.toString('hex');
            if(salt){
                var saltedPassword = password + salt;
                var hashedPassword = crypto.createHash('sha256').update(saltedPassword).digest('hex'); 
                var password_data = {
                    salt : salt,
                    hashedPassword: hashedPassword
                };
                deferred.resolve(password_data);
            }
            else{
                deferred.reject("salt invalid object type");
            }  
        })
        .catch(function(ex){
            console.log(ex);
            deferred.reject(ex);
        });
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
