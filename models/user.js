/**
 * Created by shaybar-elozana on 19/03/2017.
 */
var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

mongoose.connect('mongodb://127.0.0.1:27017/db');

// User Schema
var UserSchema = mongoose.Schema({
    username: {
        type: String,
        index:true
    },
    password: {
        type: String
    },
    email: {
        type: String
    },
    name: {
        type: String
    },
    ebayToken: {
        type: String
    },
    transactionId: {
        type: String
    },
    latestItems:{
        type : Array , "default" : []
    },
    RevokedItems:{
        type : Array , "default" : []
    },
    excludedItems:{
        type: Array , "default":[]
    },
    numberOfDays:{
        type: Number , "default":3
    },
    angleToChange:{
        type: Number , "default":5
    },
    WarningItems:{
        type: Array , "default":[]
    },
    ebayTokens:{
        type : Array , "default" : []
    }
});

var User = module.exports = mongoose.model('User', UserSchema);

module.exports.createUser = function(newUser, callback){
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(newUser.password, salt, function(err, hash) {
            newUser.password = hash;
            newUser.save(callback);
            console.log("user has been saved :"+"username: "+newUser.username+','+
                                                "email: "+newUser.email+',' +
                                                "name: "+newUser.name+','+
                                                 "ebayToken: "+newUser.ebayToken);
        });
    });
}

module.exports.getUserByUsername = function(username, callback){
    var query = {username: username};
    User.findOne(query, callback);
}

module.exports.getUserByEmail = function(email, callback){
    var query = {email: email};
    User.findOne(query, callback);
}


module.exports.getUserById = function(id, callback){
    User.findById(id, callback);
}

module.exports.comparePassword = function(candidatePassword, hash, callback){
    bcrypt.compare(candidatePassword, hash, function(err, isMatch) {
        if(err) throw err;
        callback(null, isMatch);
    });
}

module.exports.User = User;
