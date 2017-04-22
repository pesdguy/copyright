'use strict';

var paypal = require('paypal-rest-sdk');
var config = {};
var ebay = require('ebay-api');
var userToken = "";

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var express = require('express');
var router = express.Router();
//var User = require('../models/user');
var imgur = require('imgur');
var Q = require('q');
var js2xmlparser = require("js2xmlparser");
var xml2js = require('xml2js');
var request = require('request');
var cookie = require('cookie');
var User = require('../models/user');
var PythonShell = require('python-shell');
var sleep = require('sleep');
var   _ = require('lodash');
var generator = require('generate-password');
var bcrypt = require('bcryptjs');
var json2csv = require('json2csv');


// production
var devID = "c2b22d98-bf63-4370-ae1c-409f2021c579";
var certID = "261cb415-2bb3-48bf-8648-e9efc1581f16";
var appID = "GDEALSc7f-43c1-4a3d-be14-1ab28c735a6";
var sandBoxValue = false;

//sandbox application
// var devID = "9237dc03-c040-489b-853c-4a945c1bb788";
// var certID = "SBX-cd4754332a2b-8abc-4b44-81f4-35b3";
// var appID = "shaybar-shaytest-SBX-4cd475433-571f7021";
// var sandBoxValue = true;
var urlLocalDomain = "http://localhost:3000";
var urlProductionDomain = "http://52.36.175.57:3000";

var urlToUse = urlProductionDomain;


// Get Homepage
router.get('/', ensureAuthenticated, function(req, res){
    console.log("redirected !!!!!!");
    res.render('index');
});


router.post('/configCallbackUrl',function(req,res){
    if (req.body.callbackUrl){
        req.session.callbackUrl = req.body.callbackUrl;
        res.send("");
    }
    else{
        res.status(400).send("missing callBackUrl parameter");
    }
});

router.get('/configCallbackUrl',function(req,res){
    if (req.query.callbackUrl){
        req.session.callbackUrl = req.query.callbackUrl;
        res.redirect('/');
    }
    else{
        res.status(400).send("missing callBackUrl parameter");
    }
});


router.get('/success', function(req, res){

    var newUser = new User({
        name: req.session.name,
        email:req.session.email,
        username: req.session.username,
        ebayTokens: [req.session.ebayToken],
        password: req.session.password,
        transactionId:req.query['auth'],
        callbackUrl:req.session.callbackUrl
    });
    User.createUser(newUser, function(err, user){
        if(err) res.send(err);
        console.log(user);
    });


    req.flash('success_msg', 'You have been registered ');

    req.session.destroy();
    // if user has been added start task.

    //fixme: add task after addking of new user
    //taskA();

    // need to add the session to data base.
    res.redirect('/users/login');
});


router.get('/failure', function(req, res){


    req.flash('error_msg', 'Subscription failure');

    req.session.destroy();

    res.redirect('/users/login');
});

router.get('/revokedItems', function(req, res){
    var fields = ['revokeditem', 'newitem'];

    User.getUserByUsername(req.user.username, function (err, user) {
        if (err) res.send(err);
        if (user) {
            //user.update({$addToSet : {"excludedItems":[]}},false,true)
            var arr = user._doc.RevokedItems;

            try {
                var result = json2csv({ data: arr, fields: fields });
                console.log(result);
                res.json(result)
            } catch (err) {
                // Errors are thrown for bad options, or if the data is empty and no fields are provided.
                // Be sure to provide fields if it is possible that your data array will be empty.
                console.error(err);

            }

        }
    });
});

router.get('/blacklist', function(req, res){

    var itemId = req.query.itemId;

    //fixme:fix result
    var result = 1;

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({blacklist:result}));

});


router.post('/end', function(req, res){

    var itemId = req.body.itemId;
    var ebayToken = req.body.authToken;

    ebay.xmlRequest({
        serviceName : 'Trading',
        opType : 'EndItem',

        // app/environment
        devId: devID,
        certId: certID,
        appId: appID,
        sandbox: sandBoxValue,
        // per user
        authToken: ebayToken,
        params: {
            ItemID:itemId,
            EndingReason:"NotAvailable"
        }
    }, function(error, results) {
        if (error){
            res.status(500).send({ error: error.message })
        }
        else {

            console.log(JSON.stringify(results));
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(results));
        }
    });

});

router.post('/addItem', function(req, res){

    //var itemJson = req.body.itemJson;
    var ebayToken = req.body.authToken;
    var abc = req.session.xmlJSOn;
    //var itemJson = req.query['ItemJson'];
    //var parser = new xml2js.Parser(xml2js.defaults["0.1"]);
    var parser = new xml2js.Parser({explicitArray:false});

    parser.parseString(abc, function (err, result) {
        //console.dir(result);
        console.log(JSON.stringify(result));
        //res.setHeader('Content-Type', 'application/json');
        var ItemJson = JSON.stringify(result);

        var result2 = result['GetItemResponse'];
        //result2['Item']['ShippingPackageDetails']['ShippingPackage'] = 'Letter';

        // changing description and title .
        if (result2['Item']['Description'].includes(".")){
            result2['Item']['Description'].replace(".","");
        }
        else{
            result2['Item']['Description'] = result2['Item']['Description'] +".";
        }

        if (result2['Item']['Title'].includes(".")){
            result2['Item']['Title'].replace(".","");
        }
        else{
            result2['Item']['Title'] = result2['Item']['Title'] +" .";
        }


        //res.redirect('/addItem?ItemJson='+ItemJson.toString());
        for (var i=0; i<allWrong.length; i++ ){
            var res1 = goToPath(result2,allWrong[i].split("."))
            if (res1){
                setToValue(result2,allWrong[i])
            }
        }
        ebay.xmlRequest({
            serviceName : 'Trading',
            opType : 'AddItem',

            // app/environment
            devId: devID,
            certId: certID,
            appId: appID,
            sandbox: sandBoxValue,
            fromXml:true,

            // per user
            authToken: ebayToken,
            params:{
                Item:result2['Item']
            }
        }, function(error, results) {
            if (error){
                res.status(500).send({ error: error.message })
            }
            else {

                req.session.forward = undefined;
                req.session.xmlJSOn = undefined;
                console.log(JSON.stringify(results));
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(results));
            }
        });
    });


});


// sorry about it that's node not me :)
router.post('/getEndAddItem', function(req, res){

    var itemId = req.body.itemId;
    var ebayToken = req.body.authToken;
    req.session.angle = req.body.angle;
    req.session.itemId = itemId;
    req.session.ebayToken = ebayToken;
    req.session.username = req.body.username;
    req.session.title = undefined;
    req.session.description = undefined;

    ebay.xmlRequest({
        serviceName : 'Trading',
        opType : 'GetItem',

        // app/environment
        devId: devID,
        certId: certID,
        appId: appID,
        sandbox: sandBoxValue,
        raw:true,
        // per user
        authToken: ebayToken,
        params: {
            DetailLevel:"ReturnAll",
            ItemID:itemId
        }
    }, function(error, results) {
        if (error){
            console.log("error in get item: "+req.session.itemId);
            res.status(400).send({ error: error.message })
        }
        else {
            console.log(results);
            var parser = new xml2js.Parser({explicitArray:false});
            parser.parseString(results, function (err, result) {
                if (err || result['GetItemResponse']['Ack']!='Success'){
                    res.status(400).send(JSON.stringify(err));
                }
                else {
                    console.log(" ##### successfully got item for  :" + req.session.itemId);
                    req.session.xmlJSOn = result;
                    var itemId = req.session.itemId;
                    var ebayToken = req.session.ebayToken;

                    //res.send(JSON.stringify(result));
                    ebay.xmlRequest({
                        serviceName: 'Trading',
                        opType: 'EndItem',

                        // app/environment
                        devId: devID,
                        certId: certID,
                        appId: appID,
                        sandbox: sandBoxValue,
                        // per user
                        authToken: ebayToken,
                        params: {
                            ItemID: itemId,
                            EndingReason: "NotAvailable"
                        }
                    }, function (error, results) {
                        // each code except already deleted .
                        if (error && error['errors']['0']['ErrorCode']!='1047') {
                          console.log("error in deleting item: "+req.session.itemId);
                            res.status(400).send(JSON.stringify(error))
                        }
                        else{

                            console.log(" ##### successfully delete item for  :" + req.session.itemId);
                            //console.log(JSON.stringify(results));
                            console.log(JSON.stringify(result));
                            //res.setHeader('Content-Type', 'application/json');
                            var ItemJson = JSON.stringify(result);

                            var result2 = result['GetItemResponse'];
                           // result2['Item']['ShippingPackageDetails']['ShippingPackage'] = 'Letter';

                            // changing description and title .

                            req.session.description = result2['Item']['Description'];
                            req.session.title = result2['Item']['Title'];

                            if (result2['Item']['Description'].includes(".")){
                                result2['Item']['Description'].replace(".","");
                            }
                            else{
                                result2['Item']['Description'] = result2['Item']['Description'] +".";
                            }

                            if (result2['Item']['Title'].includes(".")){
                                result2['Item']['Title'].replace(".","");
                            }
                            else{
                                result2['Item']['Title'] = result2['Item']['Title'] +" .";
                            }


                            //res.redirect('/addItem?ItemJson='+ItemJson.toString());
                            for (var i=0; i<allWrong.length; i++ ){
                                var res1 = goToPath(result2,allWrong[i].split("."))
                                if (res1){
                                    setToValue(result2,allWrong[i])
                                }
                            }

                            req.session.xmlJSOnRes = result2;

                            var imgArray = [];
                            var resultArr = imgArray.concat(result2.Item['PictureDetails']['GalleryURL']).concat(result2.Item['PictureDetails']['PictureURL'])
                            //var resultArr = [];
                            fixImagesToString(resultArr,req.session.ebayToken,req.session.angle).then(function(result,err){

                                if (err){
                                    console.log("error in changing images to: "+req.session.itemId);
                                    res.status(400).send({error:err});
                                }

                                else {
                                    var tempArr = result.toString().replace("[","").replace("]","").split(",")
                                    for (var i in tempArr) {
                                        tempArr[i] = tempArr[i].replace("\'","").replace("u","").replace("\'","").replace(" ","")
                                    }


                                    req.session.xmlJSOnRes['Item']['PictureDetails']['GalleryURL'] = tempArr.shift();
                                    req.session.xmlJSOnRes['Item']['PictureDetails']['PictureURL'] = tempArr;


                                    var itemId = req.session.itemId;
                                    var ebayToken = req.session.ebayToken;

                                    ebay.xmlRequest({
                                        serviceName: 'Trading',
                                        opType: 'AddItem',

                                        // app/environment
                                        devId: devID,
                                        certId: certID,
                                        appId: appID,
                                        sandbox: sandBoxValue,
                                        fromXml: true,


                                        // per user
                                        authToken: ebayToken,
                                        params: {
                                            Item: req.session.xmlJSOnRes['Item']
                                        }
                                    }, function (error, results) {
                                        if (error && error.severityCode != 'Warning') {
                                            console.log("error :" + JSON.stringify(error));
                                            req.session.xmlJSOn = undefined;
                                            req.session.itemId = undefined;
                                            req.session.ebayToken = undefined;
                                            req.session.username = undefined;
                                            req.session.xmlJSOnRes = undefined;
                                            req.session.angle = undefined;
                                            req.session.title = undefined;
                                            req.session.description = undefined;
                                            res.status(400).send({error: error.message});

                                        }
                                        else {
                                            if (req.session.username) {
                                                checkIfBlackList(req.session.description).then(function (result, err) {
                                                    if (result == true) {
                                                        updateWarningItems(req.session.username, results.ItemID);
                                                    }
                                                    if (result == false) {
                                                        checkIfBlackList(req.session.title).then(function (res, error) {
                                                            if (res == true) {
                                                                updateWarningItems(req.session.username, results.ItemID);
                                                            }
                                                            else if (error) {
                                                                console.log(JSON.stringify(error));
                                                            }
                                                        })
                                                    }
                                                    else if (err) {
                                                        console.log("error in checking warning :" + JSON.stringify(err));
                                                    }
                                                });
                                                updateRevokedItems(req.session.username, req.session.itemId, results.ItemID);
                                            }
                                            req.session.username = undefined;
                                            req.session.xmlJSOn = undefined;
                                            req.session.itemId = undefined;
                                            req.session.ebayToken = undefined;
                                            req.session.angle = undefined;
                                            req.session.xmlJSOnRes = undefined;

                                            console.log(JSON.stringify(results));
                                            res.setHeader('Content-Type', 'application/json');
                                            res.send(JSON.stringify(results));
                                        }
                                    });

                                }

                            });
                        }
                    });
                }
            });
        }
    });
});

router.get('/getMyWarningItems',function(req,res){
    console.log('get my warning items : '+req.user.username);

    User.getUserByUsername(req.user.username, function (err, user) {
        if (err) res.send(err);
        if (user) {
            //user.update({$addToSet : {"excludedItems":[]}},false,true)
            var arr = user._doc.WarningItems;
            res.json(arr);
        }
    });
});


router.get('/getMyStores',function(req,res){
    console.log('get my stores : '+req.user.username);

    User.getUserByUsername(req.user.username, function (err, user) {
        if (err) res.send(err);
        if (user) {
            //user.update({$addToSet : {"excludedItems":[]}},false,true)
            var arr = user._doc.ebayTokens;
            var arrRes = [];
            var is_error = false;
            var i = 0 ;
            for (var index in arr) {
                // go each token and constract the data from ebay .

                ebay.xmlRequest({
                    serviceName: 'Trading',
                    opType: 'GetStore',

                    // app/environment
                    devId: devID,
                    certId: certID,
                    appId: appID,
                    sandbox: sandBoxValue,
                    // per user
                    authToken: arr[i],
                    params: {}
                }, function (error, results) {
                    if (error) {
                        arrRes.push(error);
                        console.log(JSON.stringify(error));
                        is_error = true;
                        i++;
                    }
                    else if (!is_error){
                        arrRes.push(results['Store']['Name']);
                        if (i == arr.length-1)
                            res.json(arrRes.concat(arr));
                        i++;
                    }
                });
            }
            if (is_error) res.status(400).send('error in getting store');
        }
    });
});



function isStoreNameExist(storeName,count){

    console.log(count);
    var deferred = Q.defer();
    var stream = User.User.find().stream();
    var numOfUser = 0;

    stream.on('data', function (doc) {
        if (doc._doc.ebayTokens) {
            var arrOfToken = doc._doc.ebayTokens;
            var len = arrOfToken.length;
            numOfUser++;
            var i = 0;
            arrOfToken.forEach(function (ebayToken) {
                var user = {};
                user.ebayToken = ebayToken;
                var docAndToken = _.extend({i:i,numOfUser:numOfUser,len:len,Token: ebayToken}, doc._doc);
                ///  		console.log(doc._doc.token);
                console.log("start checking for user: " + doc._doc.username);

                ebay.xmlRequest({
                    serviceName: 'Trading',
                    opType: 'GetStore',

                    // app/environment
                    devId: devID,
                    certId: certID,
                    appId: appID,
                    sandbox: sandBoxValue,
                    args: docAndToken,

                    // per user
                    authToken: ebayToken,
                    params: {}
                }, function (error, results) {
                    if (error) {
                        deferred.reject(error);
                    }
                    else if (results['Store']['Name'] == storeName) {
                        deferred.resolve(results.args);
                    }
                    else if (results.args.numOfUser == count && results.args.i == results.args.len-1){
                        deferred.resolve(false);
                    }
                });
                i++;
            });
        }
        // do something with the mongoose document
    }).on('error', function (err) {
        console.log ("###### error in checking all customers "+JSON.stringify(err));

        // handle the error
    }).on('close', function () {
        console.log ("###### finished checking all customers ");
        // the stream is closed
    });

    return deferred.promise;

}

router.post('/isStoreExist',function(req,res){
    var storeName = req.body.storeName;
    User.User.count({}, function( err, count){

        isStoreNameExist(storeName.toLowerCase(),count).then(function (result, error) {
                if (result == false)
                    res.json({'exist': false});
                else if (result)
                    res.json({'exist': result});
                else {
                    res.json(error);
                }
            });
    })
});

function returnStoreToken(storeName){

    var defer = Q.defer();

    User.User.count({}, function( err, count){

        isStoreNameExist(storeName.toLowerCase(),count).then(function (result, error) {
            if (result == false)
                defer.resolve(false);
            else if (result)
                defer.resolve(result);
            else {
                 defer.reject({error:error});
            }
        });
    })

    return defer.promise;
}



// router.get('/addStore',function(req,res){
//     console.log('building table for  new token id : '+req.user.username);
//
//     var value = req.session.ebayToken;
//
//     User.getUserByUsername(req.user.username, function (err, user) {
//         if (err) res.send(err);
//         if (user) {
//             //user.update({$addToSet : {"excludedItems":[]}},false,true)
//             user.update({$addToSet : {"ebayTokens":value}},function(err,user){
//                 if (err) {
//                     console.log(JSON.stringify(err));
//                     res.render('index', {
//                         errors: err
//                     });
//                     req.session.ebayToken = undefined;
//                 }
//                 res.json(JSON.stringify({status:"updated"}));
//                 req.session.ebayToken = undefined
//             });
//         }
//     });
//
//
// });

//update the excluded token
router.post('/removeStore',function(req,res){

    console.log('deleted store : '+req.user.username);
    console.log('delete value : '+req.body.value);

    User.getUserByUsername(req.user.username, function (err, user) {
        if (err) res.send(err);
        if (user) {
            //user.update({$addToSet : {"excludedItems":[]}},false,true)
            user.update({$pull : {"ebayTokens":req.body.value}},function(err,user){
                if (err) {
                    console.log(JSON.stringify(err))
                    res.json("failed in removeing the store");
                }
                req.flash('success_msg', 'item has been removed');
                res.json({status:"updated"});
            });
        }
    });
});



router.post('/getMyEbay', function(req, res,next){
    console.log("sanity ????");
    //res.send("hey !");
    // = undefined;
    ebay.xmlRequest({
        serviceName : 'Trading',
        opType : 'GetSessionID',

        // app/environment
        devId: devID,
        certId: certID,
        appId: appID,
        sandbox: sandBoxValue,
        // per user
        params:{
            RuName:'G_DEALS-GDEALSc7f-43c1--ettpmtmup'
        }
    }, function(error, results) {
        if (error){
            res.status(400).send({ error: error.message })
        }
        else {
            // //req.session.ID = results['SessionID'];
            // res.setHeader('Set-Cookie', cookie.serialize('sessionId', results['SessionID'], {
            //     maxAge: 60 * 60 * 24 * 7 // 1 week
            // }));
            // request('https://signin.ebay.com/ws/eBayISAPI.dll?SignIn&RUName=shay_bar-shaybar-shaytes-qxsioxde&SessID='+req.session.ID, function (error, response, body) {
            //     console.log('error:', error); // Print the error if one occurred
            //     console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
            //     console.log('body:', body); // Print the HTML for the Google homepage.
            // });
            //console.log(JSON.stringify(js2xmlparser.parse(results)));
            //res.setHeader('Content-Type', 'application/json');
            req.session.ID = results['SessionID'];
            console.log(results['SessionID']);
            res.send(results['SessionID']);
            //res.render('register');
            //res.redirect('https://signin.ebay.com/ws/eBayISAPI.dll?SignIn&RUName=shay_bar-shaybar-shaytes-qxsioxde&SessID='+req.session.ID);
            // res.writeHead(301,
            //     {Location: 'https://signin.ebay.com/ws/eBayISAPI.dll?SignIn&RUName=shay_bar-shaybar-shaytes-qxsioxde&SessID='+req.session.ID}
            // );
            // res.end();

        }
    });



});



router.get('/getMyEbay', function(req, res,next){
    console.log("sanity ????");
    //res.send("hey !");
    // = undefined;
    ebay.xmlRequest({
        serviceName : 'Trading',
        opType : 'GetSessionID',

        // app/environment
        devId: devID,
        certId: certID,
        appId: appID,
        sandbox: sandBoxValue,
        // per user
        params:{
            RuName:'G_DEALS-GDEALSc7f-43c1--ettpmtmup'
        }
    }, function(error, results) {
        if (error){
            res.status(500).send({ error: error.message })
        }
        else {
            // //req.session.ID = results['SessionID'];
            // res.setHeader('Set-Cookie', cookie.serialize('sessionId', results['SessionID'], {
            //     maxAge: 60 * 60 * 24 * 7 // 1 week
            // }));
            // request('https://signin.ebay.com/ws/eBayISAPI.dll?SignIn&RUName=shay_bar-shaybar-shaytes-qxsioxde&SessID='+req.session.ID, function (error, response, body) {
            //     console.log('error:', error); // Print the error if one occurred
            //     console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
            //     console.log('body:', body); // Print the HTML for the Google homepage.
            // });
            //console.log(JSON.stringify(js2xmlparser.parse(results)));
            //res.setHeader('Content-Type', 'application/json');
            req.session.ID = results['SessionID'];
            console.log(results['SessionID']);
            res.send(results['SessionID']);
            //res.render('register');
            //res.redirect('https://signin.ebay.com/ws/eBayISAPI.dll?SignIn&RUName=shay_bar-shaybar-shaytes-qxsioxde&SessID='+req.session.ID);
            // res.writeHead(301,
            //     {Location: 'https://signin.ebay.com/ws/eBayISAPI.dll?SignIn&RUName=shay_bar-shaybar-shaytes-qxsioxde&SessID='+req.session.ID}
            // );
            // res.end();

        }
    });
});




router.get('/fetchMyToken',function(req,res){


    sleep.sleep(30);
    var sessionID = req.session.ID;
    console.log("using cookie" + sessionID);
    ebay.xmlRequest({
        serviceName: 'Trading',
        opType: 'FetchToken',

        // app/environment
        devId: devID,
        certId: certID,
        appId: appID,
        sandbox: sandBoxValue,
        // per user
        params: {
            SessionID: sessionID
        }
    }, function (error, results) {
        if (error ) {
            console.log("error in fetch token" + error.message);
            req.session.ID = undefined;
            res.status(400).send('login to ebay store failed');
        }
        else {
            console.log(JSON.stringify(results));
            var value = results['eBayAuthToken'];

            User.getUserByUsername(req.user.username, function (err, user) {
                if (err) res.send(err);
                if (user) {
                    //user.update({$addToSet : {"excludedItems":[]}},false,true)
                    user.update({$addToSet : {"ebayTokens":value}},function(err,user){
                        if (err) {
                            console.log(JSON.stringify(err));
                        res.send(JSON.stringify("couldn't updated ebay store, try again !"))
                            req.session.ID = undefined;
                        }
                        res.send("updated successfully");
                        req.session.ID = undefined;
                    });
                }
            });


        }
    });

});

router.post('/resetEmailPassword',function(req,res){
    var email = req.body.email;
    User.getUserByEmail(email,function(err,user){
        if (err){
            res.status(400).send("no such email , try again");
        }
        else{
            var password = generator.generate({
                length: 10,
                numbers: true
            });
            console.log("password of user : "+user.email +"has been reset to :"+password);

            var options = {
                args: [user.username,user.email,"email reset password","your password has been reset to: "+password]
            };

            PythonShell.run('sendemail.py', options, function (err, results) {
                if (err) {
                    console.log(err);
                   // res.sendStatus(400);
                }
                else {
                    // results is an array consisting of messages collected during execution
                    console.log('results: %j', results);
                   // res.sendStatus(200);
                }
            });

            bcrypt.genSalt(10, function(err, salt) {
                bcrypt.hash(password, salt, function(err, hash) {
                    if (err){
                        console.log(JSON.stringify(err));
                        res.status(400).send("couldn't create password , try again");
                    }
                    else {
                        user.update({$set: {"password": hash}}, function (err, user) {
                            if (err) {
                                console.log(JSON.stringify(err));
                                res.status(400).send("couldn't create password , try again");
                            }
                            console.log("updated password succesfully ");
                            res.send("new password saved successfullly");
                        });
                    }
                });
            });
        }
    })
});



router.get('/resetEmailPassword',function(req,res){
    var email = req.query.email;
    User.getUserByEmail(email,function(err,user){
        if (err || !user){
            res.status(400).send("no such email , try again");
        }
        else{
            var password = generator.generate({
                length: 10,
                numbers: true
            });
            console.log("password of user : "+user.email +"has been reset to :"+password);

            var options = {
                args: [user.username,user.email,"email reset password","your password has been reset to: "+password]
            };

            PythonShell.run('sendemail.py', options, function (err, results) {
                if (err) {
                    console.log(err);
                    // res.sendStatus(400);
                }
                else {
                    // results is an array consisting of messages collected during execution
                    console.log('results: %j', results);
                    // res.sendStatus(200);
                }
            });

            bcrypt.genSalt(10, function(err, salt) {
                bcrypt.hash(password, salt, function(err, hash) {
                    if (err){
                        console.log(JSON.stringify(err));
                        res.status(400).send("couldn't create password , try again");
                    }
                    else {
                        user.update({$set: {"password": hash}}, function (err, user) {
                            if (err) {
                                console.log(JSON.stringify(err));
                                res.status(400).send("couldn't create password , try again");
                            }
                            console.log("updated password succesfully ");
                            res.send("new password saved successfullly");
                        });
                    }
                });
            });
        }
    })
});




function checkIfBlackList(aString){

    var defer = Q.defer();

    var lineReader = require('readline').createInterface({
        input: require('fs').createReadStream('blacklisted.txt')
    });

    var failedBool = false;
    var lineno = 1 ;

    lineReader.on('line', function (line) {


        if (aString.toLowerCase().indexOf(line.toString().toLowerCase()) > -1){
            failedBool = true;
            lineReader.close();
        }

        if (lineno >= 4096) {
            lineReader.close();
        }

        lineno++;
        //console.log(lineno);
    });

    lineReader.on('error', function (error) {
        defer.reject(error);
    });
    lineReader.on('close',function(){
        if (!failedBool)
            defer.resolve(false)
        defer.resolve(true)
    });

    return defer.promise;
}


function checkIfBlackListAndReturnExpression(aString){

    var defer = Q.defer();

    var lineReader = require('readline').createInterface({
        input: require('fs').createReadStream('blacklisted.txt')
    });

    var failedBool = false;
    var lineno = 1 ;
    var exp = undefined;

    lineReader.on('line', function (line) {


        if (aString.toLowerCase().indexOf(line.toString().toLowerCase()) > -1){
            failedBool = true;
            exp = aString;
            lineReader.close();
        }

        if (lineno >= 4096) {
            lineReader.close();
        }

        lineno++;
        //console.log(lineno);
    });

    lineReader.on('error', function (error) {
        defer.reject(error);
    });
    lineReader.on('close',function(){
        if (!failedBool)
            defer.resolve(false);
        defer.resolve(exp)
    });

    return defer.promise;
}

router.get('/checkBlack',function(req,res){

    var aString = req.query.value;
    checkIfBlackList(aString).then(function(result,err){
        if (result == true){
            res.json({result:true})
        }
        else if (result == false){
            res.json({result:false})
        }
        else {
            res.status(400).send({error:err})
        }
    });
});

router.post('/ImageAndBlacklist',function(req,res){

    var description = req.body.description;
    var title = req.body.title;
    var images = req.body.images;
    var storeName = req.body.storeName;

    returnStoreToken(storeName).then(function(resultArgs,error){
        if (error){
            res.status(400).send({error:error})
        }
        else if (resultArgs == false){
            res.status(400).send({error:"no such user logged to the system"});
        }
        else{
            checkIfBlackListAndReturnExpression(description).then(function(result,err){
                // if error return error .
                if (err){
                    res.status(400).send({error:err})
                }
                else if (result == false){
                    checkIfBlackListAndReturnExpression(title).then(function(result,err){
                        if (err){
                            res.status(400).send({error:err})
                        }
                        else if (result == false){
                            fixImagesToString3(images,resultArgs['angleToChange']).then(function(result,error){
                                res.json({exist:false,images:result})
                            },function(error){
                                if (error){
                                    res.status(400).send({error:error})
                                }
                            })
                        }
                        else {
                            var phrase = result;
                            fixImagesToString3(images,resultArgs['angleToChange']).then(function(result){
                                res.json({exist:true,phrase:phrase,images:result})
                            },function(error){
                                res.status(400).send({error:error})
                            })

                        }
                    });
                }
                else {
                    var phrase = result;
                    fixImagesToString3(images,resultArgs['angleToChange']).then(function(result){

                        res.json({exist:true,phrase:phrase,images:result})
                    },function(error){
                        res.status(400).send({error:error})
                    })
                }
            });
        }
    });
});


router.post('/fetchToken', function(req, res){

    //console.log("using session id:" +req.session.ID);
    req.session.ebayToken = undefined;
    var name = req.body.name;
    var email = req.body.email;
    var username = req.body.username;
    var password = req.body.password;
    var password2 = req.body.password2;

    // Validation
    req.checkBody('name', 'Name is required').notEmpty();
    req.checkBody('email', 'Email is required').notEmpty();
    req.checkBody('email', 'Email is not valid').isEmail();
    req.checkBody('username', 'Username is required').notEmpty();
    req.checkBody('password', 'Password is required').notEmpty();
    req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

    var errors = req.validationErrors();
    var moreErrors = [];

    var isErrorEmpty = false;
    if (errors){
        isErrorEmpty = true;
        res.render('register',{
            errors:errors
        });
    }

    else if (!isErrorEmpty) {
        // check user name and email to repair
        User.getUserByUsername(username, function (err, user) {
            if (err ) {
                res.send(err);
            }
            else if (user ) {
                console.log("no user name in registration");
                res.render('register', {
                    errors: [{msg: "user name already exist choose  another one"}]
                });
            }
            // user name is valid check email
            else{
                User.getUserByEmail(email, function (err, userEmail) {
                    if (err ) {
                        res.send(err);
                    }
                    else if (userEmail ) {
                        res.render('register', {
                            errors: [{msg: "email already exist choose  another one"}]
                        });
                    }
                    else{

                        req.session.name = name;
                        req.session.username = username;
                        req.session.email = email;
                        req.session.password = password;
                        //req.session = {'name':name,'email':email,'username':username,'ebayToken':ebayToken,'password':password};

                        // var cookies = cookie.parse(req.headers.cookie || '');
                        // var sessionID = cookies.sessionId;
                        var sessionID = req.session.ID;
                        console.log("using cookie" + sessionID);
                        ebay.xmlRequest({
                            serviceName: 'Trading',
                            opType: 'FetchToken',

                            // app/environment
                            devId: devID,
                            certId: certID,
                            appId: appID,
                            sandbox: sandBoxValue,
                            // per user
                            params: {
                                SessionID: sessionID
                            }
                        }, function (error, results) {
                            if (error ) {
                                console.log("error in fetch token" + error.message);
                                res.render('register', {
                                    errors: [{msg: "login to ebay store failed ! , please try again"}]
                                });
                            }
                            else {
                                console.log(JSON.stringify(results));
                                req.session.ebayToken = results['eBayAuthToken'];
                                res.render('plan');

                            }
                        });

                    }
                });

            }
        });
    }
});



router.post('/reviseItem', function(req, res){

    var itemId = req.body.itemId;
    var ebayToken = req.body.authToken;
    var Title = req.body.Title;
    var Description = req.body.Description;

    ebay.xmlRequest({
        serviceName : 'Trading',
        opType : 'ReviseItem',

        // app/environment
        devId: devID,
        certId: certID,
        appId: appID,
        sandbox: sandBoxValue,
        // per user
        authToken: ebayToken,
        params:{
        Item: {
            ItemID: itemId,
            Description: Description,
            Title: Title
        }
        }
    }, function(error, results) {
        if (error){
            res.status(500).send({ error: error.message })
        }
        else {
            console.log(JSON.stringify(js2xmlparser.parse(results)));
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(js2xmlparser.parse(results)));
        }
    });

});

//
// var addImageToEbay = function(picData,ebayToken){
//
//     var deferred = Q.defer();
//
//     ebay.xmlRequest({
//         serviceName : 'Trading',
//         opType : 'UploadSiteHostedPictures',
//         version:517,
//         upload:true,
//
//         // app/environment
//         headers:{'Content-Type':'multipart/form-data; charset=UTF-8; boundary=please'},
//         //headers:{'Content-Disposition': 'form-data; name="XML Payload";boundary=MIME_boundary',
//         //    'Content-Type': 'text/xml;charset=utf-8'},
//
//         devId: devID,
//         certId: certID,
//         appId: appID,
//         sandbox: sandBoxValue,
//         raw:true,
//         mime:picData,
//
//         // per user
//         authToken: ebayToken,
//         params: {
//  //           PictureData:"new_file2",
//  //            WarningLevel:"High",
//  //            PictureName:"this is a test",
//             // Version:517
//         }
//     }, function(error, results) {
//         if (error){
//             deferred.reject(JSON.stringify(error));
//         }
//         else {
//             var parser = new xml2js.Parser(xml2js.defaults["0.1"]);
//             parser.parseString(results, function (err, result) {
//                 if (err){
//                     deferred.reject(JSON.stringify(err));
//                 }
//                 else {
//                     //console.dir(result);
//                     //console.log(JSON.stringify(result));
//                     console.log(" ##### successfully get link for");
//                     deferred.resolve(JSON.stringify(results));
//
//                 }
//             });
//         }
//     });
//
//     return deferred.promise;
//
// }
//

router.post('/getItem', function(req, res){

    var itemId = req.body.itemId;
    var ebayToken = req.body.authToken;
    ebay.xmlRequest({
        serviceName : 'Trading',
        opType : 'GetItem',

        // app/environment
        devId: devID,
        certId: certID,
        appId: appID,
        sandbox: sandBoxValue,
        raw:true,
        // per user
        authToken: ebayToken,
        params: {
            DetailLevel:"ReturnAll",
            ItemID:itemId
        }
    }, function(error, results) {
        if (error){
            res.status(400).send({ error: error.message })
        }
        else {
            var parser = new xml2js.Parser(xml2js.defaults["0.1"]);
            parser.parseString(results, function (err, result) {
                if (err){
                    res.status(400).send({ error: error.message })
                }
                else {
                    //console.dir(result);
                    //console.log(JSON.stringify(result));
                    console.log(" ##### successfully get item for  :" + req.session.itemId);


                    //res.setHeader('Content-Type', 'application/json');
                    //var ItemJson = JSON.stringify(results);
                    //res.redirect('/addItem?ItemJson='+ItemJson.toString());get
                    //req.session.xmlJSOn = results;


                    //res.redirect(307,'/addItem?ItemJson='+results)
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify(result));
                }
            });
        }
    });
});

router.post('/sendemail', function(req, res, next) {
    var api_key = 'key-3362b304695a1adfc711a259d5f8e58d';
    var domain = 'mg.gdeals.net';
    var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});;

    var data = {
        from: 'Excited User <mg.gdeals.net>',
        to: 'sbarelozana@gmail.com',
        subject: 'Hello',
        text: 'Testing some Mailgun awesomness!'
    };

    mailgun.messages().send(data, function (error, body) {
        console.log(body);
    });
});

// get the expired excludedToken .
router.get('/ExcludedToken',function(req,res){
    console.log('building table for  new token id : '+req.user.username);

    User.getUserByUsername(req.user.username, function (err, user) {
        if (err) res.send(err);
        if (user) {
            //user.update({$addToSet : {"excludedItems":[]}},false,true)
            res.json(user._doc.excludedItems);
        }
    });
});

router.get('/days',function(req,res){
    console.log('get number of days: '+req.user.username);

    User.getUserByUsername(req.user.username, function (err, user) {
        if (err) res.send(err);
        if (user) {
            //user.update({$addToSet : {"excludedItems":[]}},false,true)
            res.json(user._doc.numberOfDays);
        }
    });
});

router.get('/updateDays',function(req,res){
  console.log("value to update : "+req.user.username +","+req.query.value);

    User.getUserByUsername(req.user.username, function (err, user) {
        if (err) res.send(err);
        if (user) {
            var num = parseInt(req.query.value)
            user.update({$set : {"numberOfDays":num}},function(err,user){
                if (err) {
                    console.log(JSON.stringify(err));
                    res.render('index', {
                        errors: err
                    });
                }
                console.log("updated days : "+req.query.value);
                res.json(JSON.stringify('days updated to :'+req.query.value));
            });
        }
    });
});

router.get('/Angle',function(req,res){
    console.log('get angle: '+req.user.username );

    User.getUserByUsername(req.user.username, function (err, user) {
        if (err) res.send(err);
        if (user) {
            //user.update({$addToSet : {"excludedItems":[]}},false,true)
            res.json(user._doc.angleToChange);
        }
    });
});

router.get('/updateAngle',function(req,res){
    console.log("value to update : "+req.user.username +","+req.query.value);

    User.getUserByUsername(req.user.username, function (err, user) {
        if (err) res.send(err);
        if (user) {
            var num = parseInt(req.query.value);
            user.update({$set : {"angleToChange":num}},function(err,user){
                if (err) {
                    console.log(JSON.stringify(err));
                    res.render('index', {
                        errors: err
                    });
                }
                console.log("updated angle : "+req.query.value);
                res.json(JSON.stringify('angle updated to :'+req.query.value));
            });
        }
    });
});
//fixme:add support for changing callback.
// router.post('/updateCallBackUrl',function(req,res){
//     //console.log("value to update : "+req.user.username +","+req.query.value);
//     var oldCallbackUrl = req.body.oldCallbackUrl;
//     var newCallbackUrl = req.body.newCallbackUrl;
//
//
//
//
//     User.getUserByUsername(req.user.username, function (err, user) {
//         if (err) res.send(err);
//         if (user) {
//             var num = parseInt(req.query.value);
//             user.update({$set : {"angleToChange":num}},function(err,user){
//                 if (err) {
//                     console.log(JSON.stringify(err));
//                     res.render('index', {
//                         errors: err
//                     });
//                 }
//                 console.log("updated angle : "+req.query.value);
//                 res.json(JSON.stringify('angle updated to :'+req.query.value));
//             });
//         }
//     });
// });


//update the excluded token
router.get('/insertExcludedToken',function(req,res){

console.log('inserted new token id : '+req.user.username);
console.log('insert value : '+req.query.value);

    var value = req.query.value;

    User.getUserByUsername(req.user.username, function (err, user) {
        if (err) res.send(err);
        if (user) {
            //user.update({$addToSet : {"excludedItems":[]}},false,true)
            user.update({$addToSet : {"excludedItems":value}},function(err,user){
                if (err) {
                    console.log(JSON.stringify(err));
                    res.render('index', {
                        errors: err
                    });
                }
                res.json(JSON.stringify({status:"updated"}));
            });
        }
        });
});

//update the excluded token
router.get('/removeExcludedToken',function(req,res){

    console.log('deleted excluded for id : '+req.user.username);
    console.log('delete value : '+req.query.value);

    User.getUserByUsername(req.user.username, function (err, user) {
        if (err) res.send(err);
        if (user) {
            //user.update({$addToSet : {"excludedItems":[]}},false,true)
            user.update({$pull : {"excludedItems":req.query.value}},function(err,user){
                if (err) {
                    console.log(JSON.stringify(err))
                    res.render('index', {
                        errors: err
                    });
                }
                req.flash('success_msg', 'item has been removed');
                res.json({status:"updated"});
            });
        }
    });
});


router.post('/image' , function(req,res){
    var options = {
        args: JSON.stringify(req.body)
    };
    PythonShell.run('rotate.py', options, function (err, results) {
        if (err) {
            console.log(err);
            res.sendStatus(400);
        }
        else {
            // results is an array consisting of messages collected during execution
            console.log('results: %j', JSON.stringify(results));
            // change text and description
            var result = req.body;
            result.description = req.body.description;
            result.title = req.body.title;
            result.images = req.body.images

            // upload new images and send response
            var itemsProcessed = 0;
            var length = result.images.length;
            result.images.forEach(function(item){
                item['image_name'] = item['image_name']+'_new'
                uploadImage(item['image_name'])
                    .then(function (json) {
                        itemsProcessed++;
                        item['image_link'] = json.data['link'];
                        console.log(json.data['link']);
                        if(itemsProcessed === length) {
                            //fixme: add boolean by expression
                            result.blackListExist = true;
                            result.blackListPhrase = false;
                            res.setHeader('Content-Type', 'application/json');
                            res.send(JSON.stringify(result));
                        }

                    })
                    .catch(function (err) {
                        console.error(err.message);
                        res.status(500).send({ error: err.message })
                    });

            });
        }
    });
});

// sequently uploading images  , to imagur
function uploadImage(filePath) {
    var deferr = Q.defer();
    imgur.setClientId('66e1481338b4654', '228a7e9dc1da979766005d523d1c60580c570a2d');
    imgur.uploadFile(filePath+'.jpg').then(function (json) {
        //console.log(json.data['link']);
        deferr.resolve(json)
    })
        .catch(function (err) {
            //console.error(err.message);
            deferr.reject(err.message);
        });
    return deferr.promise;
}

// sequently uploading images to ebay
function uploadToEbay(itemid,ebayToken,imageString){

}

var fixImagesToString = function(imgArray,ebayToken,angle){



    var deferred = Q.defer();

    // no images
    if (imgArray.length == 0){
        deferred.resolve("");
    }
    else {
        var createJson = {};
        createJson['angle'] = angle;
        createJson['ebayToken'] = ebayToken;
        createJson['images'] = [];
        var k = 0;
        for (var item in imgArray) {
            createJson['images'].push({'image_name': 'new' + k.toString(), 'image_link': imgArray[k]})
            k += 1;
        }
        var options = {
            args: JSON.stringify(createJson)
        };

        PythonShell.run('rotate2.py', options, function (err, results) {
            if (err) {
                console.log(err);
                 deferred.reject(JSON.stringify(err));
            }
            else {
                deferred.resolve(results[1])
            }
        });
    }

    return deferred.promise;
}


var fixImagesToString3 = function(imgJson,angle){
    var deferred = Q.defer();

    var createJson = {};
    createJson['angle'] = angle;
    createJson['images'] = imgJson;

    var options = {
        args: JSON.stringify(createJson)
    };
    var resArr = [];
    PythonShell.run('rotate3.py', options, function (err, results) {
        if (err) {
            console.log(err);
            deferred.reject("cannot convert the given pictures");
        }
        else {
            var tempArr = results.toString().replace("[","").replace("]","").split(",");
            for (var i in imgJson) {
                var item = {};
                item['image_name'] = imgJson[i]['image_name'];
                item['image_base64'] = tempArr[i];
                resArr.push(item);
            }
            deferred.resolve(resArr);
        }
    });

    return deferred.promise;
};
//
// // sequently uploading images  , to imagur
// function uploadImageflicker(filePath) {
//
//     var deferr = Q.defer();
//     Flickr.authenticate(FlickrOptions, function(error, flickr) {
//         if (error){
//             deferr.reject(JSON.stringify(err))
//         }
//         else {
//             var uploadOptions = {
//                 photos: [{
//                     photo: path.join(__dirname,'..',filePath)
//                 }],
//                 is_public:"1"
//             };
//
//             Flickr.upload(uploadOptions, FlickrOptions, function (err, result) {
//                 if (err) {
//                     deferr.reject(JSON.stringify(err))
//                 }
//                 deferr.resolve(JSON.stringify('https://farm2.staticflickr.com/2/'+result[0]+'_'+FlickrOptions.secret+'.jpg'))
//             });
//         }
//     });
//
//
//     return deferr.promise;
// }


function ensureAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return next();
    } else {
        //req.flash('error_msg','You are not logged in');
        res.redirect('/users/login');
    }
}

module.exports = router;


//mongoose.connect('mongodb://127.0.0.1:27017/db');
// var userDataSchema = new Schema({
//     token: {type: String, required: true},
//     id_list : { type : Array , "default" : [] }
// }, {collection: 'user-data'});
// var UserData = mongoose.model('UserData', userDataSchema);

// Routes

// // fixme: change to router.get format ( do it for all !)
// exports.index = function (req, res) {
//   res.render('index');
// };
//
// exports.create = function (req, res) {
//     var method = req.param('method');
//     var item_token = req.param('item_token');
//     userToken =  item_token;
//
//     var payment = {
// 		"intent": "sale",
// 		"payer": {
// 		},
// 		"transactions": [{
// 			"amount": {
//                 "total": "1.00",
//                 "currency": "USD"
// 			},
//             "description": "My awesome payment"
// 		}]
// 	};
// 	console.log(userToken);
//
// 	if (method === 'paypal') {
// 		payment.payer.payment_method = 'paypal';
// 		payment.redirect_urls = {
// 			"return_url": "http://localhost:3000/execute",
// 			"cancel_url": "http://localhost:3000/cancel"
// 		};
// 	}
// 	//
// 	// else if (method === 'credit_card') {
// 	// 	var funding_instruments = [
// 	// 		{
// 	// 			"credit_card": {
// 	// 				"type": req.param('type').toLowerCase(),
// 	// 				"number": req.param('number'),
// 	// 				"expire_month": req.param('expire_month'),
// 	// 				"expire_year": req.param('expire_year'),
// 	// 				"first_name": req.param('first_name'),
// 	// 				"last_name": req.param('last_name')
// 	// 			}
// 	// 		}
// 	// 	];
// 	// 	payment.payer.payment_method = 'credit_card';
// 	// 	payment.payer.funding_instruments = funding_instruments;
// 	// }
//
//     var d = new Date();
//     // searching all items 3 month ago .
//     var newd = new Date();
//     // newd.setMonth(newd.getMonth()-2);
//     newd.setHours(newd.getDay())
//     ebay.xmlRequest({
//         serviceName : 'Trading',
//         opType : 'GetSellerList',
//
//         // app/environment
//         devId: devID,
//         certId: certID,
//         appId: appID,
//         sandbox: true,
//         // per user
//         authToken: item_token,
//         params: {
//             // StartTimeFrom:newd.toISOString(),
// 			// StartTimeTo:d.toISOString()
//             EndTimeFrom:newd
//
//         }
//     }, function(error, results) {
//         if (error) {
//             console.log(error.errors[0]['ShortMessage']);
//             // can send also all json by error .
//             res.render('error', {'error': error.errors[0]['ShortMessage']});
//             all_items = null;
//         }
//         else {
//             all_items = results;
//             paypal.payment.create(payment, function (error, payment) {
//                 if (error) {
//                     console.log(error);
//                     res.render('error', { 'error': error });
//                 } else {
//                     req.session.paymentId = payment.id;
//                     // res.render('create', { 'payment': payment });
//                     var redirectUrl;
//                     for(var i=0; i < payment.links.length; i++) {
//                         var link = payment.links[i];
//                         if (link.method === 'REDIRECT') {
//                             redirectUrl = link.href;
//                         }
//                     }
//                     res.redirect(redirectUrl);
//                 }
//             });
//         }
//     });
// };
//
// exports.checkListExpiration = function (req,res){
//
//     var token_item = req.param('token');
//
//
//
//
//
// }
//
// exports.execute = function (req, res) {
//
// 	// var TokenUser = userToken;
// 	var token_item = req.param('token');
//     var item_token = req.param('item_token');
//     var paymentId = req.session.paymentId;
// 	var payerId = req.param('PayerID');
//
// 	var details = { "payer_id": payerId };
// 	var payment = paypal.payment.execute(paymentId, details, function (error, payment) {
// 		if (error || all_items==null) {
// 			if (all_items == null ){
// 				error = "no items in ebay token";
// 			}
// 			console.log(error);
// 			res.render('error', { 'error': error });
// 		}
// 		else {
// 		// if payment succeded !!!
//             var item = {
//                 token: userToken,
//                 id_list:all_items.Items
//             };
//             var data = new UserData(item);
//             data.save();
// 			res.render('execute', { 'payment': payment, 'userToken':userToken});
// 		}
// 	});
// };
//
// exports.cancel = function (req, res) {
//   res.render('cancel');
// };

// Configuration

router.post('/testing/updateStatus',function(req,res){
    //console.log(req);
    //console.log(res);
    res.json({success:"success"})
});



router.get('/startTask',function(req,res){
    taskA();
    res.send(200);
});



router.init = function (c) {
	config = c;
	paypal.configure(c.api);
};


// currently configured only for three days ahead .
var taskA = function(){

    var stream = User.User.find().stream();

    stream.on('data', function (doc) {
    	if (doc._doc.ebayTokens){
    	    var arrOfToken = doc._doc.ebayTokens;
            arrOfToken.forEach(function(ebayToken) {
                var user = {};
                user.ebayToken = ebayToken;
                var d = new Date();
                var e = new Date();
                var numberOfDays = doc._doc.numberOfDays;
                e.setDate(d.getDate() + numberOfDays);
                var docAndToken = _.extend({Token:ebayToken},doc._doc);
                ///  		console.log(doc._doc.token);
                console.log("start checking for user: " + doc._doc.username);
                ebay.xmlRequest({
                    serviceName: 'Trading',
                    opType: 'GetSellerList',

                    // app/environment
                    devId: devID,
                    certId: certID,
                    appId: appID,
                    sandbox: sandBoxValue,
                    args: docAndToken,
                    // per user
                    authToken: ebayToken,
                    params: {
                        EndTimeFrom: d.toISOString(),
                        EndTimeTo: e.toISOString()
                    }
                }, function (error, results) {
                    if (error) {
                        console.log("failure : " + error.message);
                    }
                    else if (results.Items.length > 0 ) {
                        console.log("start checking for user: " + results.args['username']);
                        console.log(JSON.stringify(results.Items));
                        var PromiseArray = [];

                        results.Items = results.Items[0];
                        console.log("only running for one item : "+results.Items['ItemID']);
//                        results.Items['ItemID'] = '182514295780';
                        results.Items['ItemID'] = '192148140916';

                        if (!(results.Items instanceof Array)) {
                            createRequest(urlToUse + '/getEndAddItem', results.Items, results);
                        }

                        else if (results.Items.length > 0) {
                            for (var i in results.Items) {
                                var item = results.Items[i];
                                createRequest(urlToUse + '/getEndAddItem', item, results);
                            }
                        }


                        // Q.allSettled(PromiseArray)
                        //     .then(function (results) {
                        //         results.forEach(function (result) {
                        //             if (result.state === "fulfilled") {
                        //                 var value = result.value;
                        //             } else {
                        //                 var reason = result.reason;
                        //             }
                        //         });
                        //     });

                    }
                });
            });
    	}

        // do something with the mongoose document
    }).on('error', function (err) {
        console.log ("###### error in checking all customers "+JSON.stringify(err));

        // handle the error
    }).on('close', function () {
    	console.log ("###### finished checking all customers ");
        // the stream is closed
    });

};


function createRequest(url,item,results){

    var deferred = Q.defer();
    User.getUserByUsername(results.args['username'],function(err,user){
        if (err) deferred.reject("no such user");
        else {
            var arr = user.excludedItems;
            if (arr.includes(item['ItemID'])){
                console.log("item is excluded: :"+item['ItemID']);
                deferred.reject('item excluded: '+item['ItemID']);
            }
            else{
                request({
                    url: url,
                    method: "POST",
                    json: {itemId:item['ItemID'],authToken:results.args['Token'],username:results.args['username'],angle:
                    results.args['angleToChange']}
                },  function (error, resp, body) {
                    if (error){
                        console.log("error : " +JSON.stringify(error)+"in item : "+item['ItemID']);
                        request({
                            url: results.args['callbackUrl']+'/updateStatus',
                            method: "POST",
                            json: {error:error}
                        },  function (error, resp, body) {
                            if (error){
                                console.log("error in listing the item to callback");
                            }
                            else{
                                console.log("item listed successfully to callback");
                            }
                        });
                        deferred.reject(new Error(error));
                    }
                    else {
                        deferred.resolve("success for item : "+item.ItemID);
                        console.log("success for item : "+item.ItemID);
                        request({
                            url: results.args['callbackUrl']+'/updateStatus',
                            method: "POST",
                            json: {itemID:item.ItemID,responeJson:resp}
                        },  function (error, resp, body) {
                            if (error){
                                console.log("error in listing the item to callback");
                            }
                            else{
                                console.log("item listed successfully to callback");
                            }
                        });


                    }
                });
            }
        }
    });
    return deferred.promise;
}

router.get('/testing',function(req,res){
    var item = "asdad";
    var resp = "bbb";
    request({
        url: config.callBackUrl+'/updateStatus',
        method: "POST",
        json: {itemID:item,responeJson:resp}
    },  function (error, resp, body) {
        if (error){
            res.status(400).send(error);
            console.log("error in listing the item to callback");
        }
        else{
            res.send("success");
            console.log("item listed successfully to callback");
        }
    });
});


function goToPath(array,path){

    for (var i=0; i<path.length; i++){
        if ( array[path[i]]){
            array = array[path[i]];
        }else{
            return "";
        }
    }
    return array;
};

function setToValue(obj, path) {
    var i;
    path = path.split('.');
    for (i = 0; i < path.length - 1; i++)
        obj = obj[path[i]];

    delete obj[path[i]];
}

function updateRevokedItems(username,revokeditem,newitem) {
    User.getUserByUsername(username, function (err, user) {
        if (err) return JSON.stringify(err);
        if (user) {
            //user.update({$addToSet : {"excludedItems":[]}},false,true)
            user.update({$addToSet: {'RevokedItems': {revokeditem:revokeditem, newitem: newitem}}}, function (err, user) {
                if (err) {
                    return JSON.stringify(err)
                }
                return "success";
            });
        }
    });
}

function updateWarningItems(username,item) {
    User.getUserByUsername(username, function (err, user) {
        if (err) return JSON.stringify(err);
        if (user) {
            //user.update({$addToSet : {"excludedItems":[]}},false,true)
            user.update({$addToSet: {'WarningItems': item}}, function (err, user) {
                if (err) {
                    return JSON.stringify(err)
                }
                return "success";
            });
        }
    });
}

//fixme: change it to 24 hours !
//setInterval(taskA,10000);

var allWrong =[
    "Item.BestOfferDetails.BestOfferCount",
    "Item.BusinessSellerDetails",
    "Item.BusinessSellerDetails.AdditionalContactInformation",
    "Item.BusinessSellerDetails.Address",
    "Item.BusinessSellerDetails.Address.FirstName",
    "Item.BusinessSellerDetails.Address.LastName",
    "Item.BusinessSellerDetails.Email",
    "Item.BusinessSellerDetails.Fax",
    "Item.BusinessSellerDetails.LegalInvoice",
    "Item.BusinessSellerDetails.TermsAndConditions",
    "Item.BusinessSellerDetails.TradeRegistrationNumber",
    "Item.BusinessSellerDetails.VATDetails",
    "Item.BusinessSellerDetails.VATDetails.BusinessSeller",
    "Item.BusinessSellerDetails.VATDetails.RestrictedToBusiness",
    "Item.BusinessSellerDetails.VATDetails.VATID",
    "Item.BusinessSellerDetails.VATDetails.VATPercent",
    "Item.BusinessSellerDetails.VATDetails.VATSite",
    "Item.BuyerGuaranteePrice",
    "Item.BuyerProtection",
    "Item.Charity.CharityName",
    "Item.Charity.LogoURL",
    "Item.Charity.Mission",
    "Item.Charity.Status",
    "Item.ConditionDefinition",
    "Item.ConditionDisplayName",
    "Item.DiscountPriceInfo.PricingTreatment",
    "Item.FreeAddedCategory",
    "Item.FreeAddedCategory.CategoryID",
    "Item.FreeAddedCategory.CategoryName",
    "Item.IntegratedMerchantCreditCardEnabled",
    "Item.IsIntermediatedShippingEligible",
    "Item.ItemCompatibilityList.Compatibility.NameValueList.Source",
    "Item.ItemID",
    "Item.ItemPolicyViolation.PolicyID",
    "Item.ItemPolicyViolation.PolicyText",
    "Item.ItemSpecifics.NameValueList.Source",
    "Item.ListingDetails.Adult",
    "Item.ListingDetails.BindingAuction",
    "Item.ListingDetails.BuyItNowAvailable",
    "Item.ListingDetails.CheckoutEnabled",
    "Item.ListingDetails.ConvertedBuyItNowPrice",
    "Item.ListingDetails.ConvertedReservePrice",
    "Item.ListingDetails.ConvertedStartPrice",
    "Item.ListingDetails.EndTime",
    "Item.ListingDetails.HasPublicMessages",
    "Item.ListingDetails.HasReservePrice",
    "Item.ListingDetails.HasUnansweredQuestions",
    "Item.ListingDetails.RelistedItemID",
    "Item.ListingDetails.SecondChanceOriginalItemID",
    "Item.ListingDetails.StartTime",
    "Item.ListingDetails.TCROriginalItemID",
    "Item.ListingDetails.ViewItemURL",
    "Item.ListingDetails.ViewItemURLForNaturalSearch",
    "Item.LocationDefaulted",
    "Item.PaymentAllowedSite",
    "Item.PictureDetails.ExtendedPictureDetails.PictureURLs.eBayPictureURL",
    "Item.PictureDetails.ExtendedPictureDetails.PictureURLs.ExternalPictureURL",
    "Item.PictureDetails.PictureSource",
    "Item.PrimaryCategory.CategoryName",
    "Item.ProductListingDetails.Copyright",
    "Item.ProductListingDetails.StockPhotoURL",
    "Item.ProxyItem",
    "Item.QuantityAvailableHint",
    "Item.QuantityThreshold",
    "Item.RelistParentID",
    "Item.ReviseStatus",
    "Item.ReviseStatus.BuyItNowAdded",
    "Item.ReviseStatus.BuyItNowLowered",
    "Item.ReviseStatus.ItemRevised",
    "Item.ReviseStatus.ReserveLowered",
    "Item.ReviseStatus.ReserveRemoved",
    "Item.SecondaryCategory.CategoryName",
    "Item.Seller.AboutMePage",
    "Item.Seller.eBayGoodStanding",
    "Item.Seller.Email",
    "Item.Seller.FeedbackPrivate",
    "Item.Seller.FeedbackRatingStar",
    "Item.Seller.FeedbackScore",
    "Item.Seller.IDVerified",
    "Item.Seller.NewUser",
    "Item.Seller.RegistrationAddress",
    "Item.Seller.RegistrationAddress.CityName",
    "Item.Seller.RegistrationAddress.Country",
    "Item.Seller.RegistrationAddress.CountryName",
    "Item.Seller.RegistrationAddress.FirstName",
    "Item.Seller.RegistrationAddress.LastName",
    "Item.Seller.RegistrationAddress.Name",
    "Item.Seller.RegistrationAddress.Phone",
    "Item.Seller.RegistrationAddress.PostalCode",
    "Item.Seller.RegistrationAddress.Street",
    "Item.Seller.RegistrationAddress.Street1",
    "Item.Seller.RegistrationAddress.Street2",
    "Item.Seller.RegistrationDate",
    "Item.Seller.SellerInfo",
    "Item.Seller.SellerInfo.AllowPaymentEdit",
    "Item.Seller.SellerInfo.CheckoutEnabled",
    "Item.Seller.SellerInfo.CIPBankAccountStored",
    "Item.Seller.SellerInfo.GoodStanding",
    "Item.Seller.SellerInfo.QualifiesForB2BVAT",
    "Item.Seller.SellerInfo.SafePaymentExempt",
    "Item.Seller.SellerInfo.SellerBusinessType",
    "Item.Seller.SellerInfo.SellerLevel",
    "Item.Seller.SellerInfo.StoreOwner",
    "Item.Seller.SellerInfo.StoreURL",
    "Item.Seller.SellerInfo.TopRatedSeller",
    "Item.Seller.Site",
    "Item.Seller.Status",
    "Item.Seller.UserID",
    "Item.Seller.UserIDChanged",
    "Item.Seller.UserIDLastChanged",
    "Item.Seller.VATStatus",
    "Item.SellerContactDetails.FirstName",
    "Item.SellerContactDetails.LastName",
    "Item.SellerContactDetails.PhoneCountryPrefix",
    "Item.SellerContactDetails.Street1",
    "Item.SellerVacationNote",
    "Item.SellingStatus.BidCount",
    "Item.SellingStatus.BidIncrement",
    "Item.SellingStatus.ConvertedCurrentPrice",
    "Item.SellingStatus.HighBidder",
    "Item.SellingStatus.HighBidder.AboutMePage",
    "Item.SellingStatus.HighBidder.BuyerInfo",
    "Item.SellingStatus.HighBidder.BuyerInfo.ShippingAddress",
    "Item.SellingStatus.HighBidder.BuyerInfo.ShippingAddress.Country",
    "Item.SellingStatus.HighBidder.BuyerInfo.ShippingAddress.FirstName",
    "Item.SellingStatus.HighBidder.BuyerInfo.ShippingAddress.LastName",
    "Item.SellingStatus.HighBidder.BuyerInfo.ShippingAddress.PostalCode",
    "Item.SellingStatus.HighBidder.eBayGoodStanding",
    "Item.SellingStatus.HighBidder.Email",
    "Item.SellingStatus.HighBidder.FeedbackPrivate",
    "Item.SellingStatus.HighBidder.FeedbackRatingStar",
    "Item.SellingStatus.HighBidder.FeedbackScore",
    "Item.SellingStatus.HighBidder.IDVerified",
    "Item.SellingStatus.HighBidder.NewUser",
    "Item.SellingStatus.HighBidder.RegistrationAddress",
    "Item.SellingStatus.HighBidder.RegistrationAddress.CityName",
    "Item.SellingStatus.HighBidder.RegistrationAddress.Country",
    "Item.SellingStatus.HighBidder.RegistrationAddress.CountryName",
    "Item.SellingStatus.HighBidder.RegistrationAddress.FirstName",
    "Item.SellingStatus.HighBidder.RegistrationAddress.LastName",
    "Item.SellingStatus.HighBidder.RegistrationAddress.Name",
    "Item.SellingStatus.HighBidder.RegistrationAddress.Phone",
    "Item.SellingStatus.HighBidder.RegistrationAddress.PostalCode",
    "Item.SellingStatus.HighBidder.RegistrationAddress.Street",
    "Item.SellingStatus.HighBidder.RegistrationAddress.Street1",
    "Item.SellingStatus.HighBidder.RegistrationAddress.Street2",
    "Item.SellingStatus.HighBidder.RegistrationDate",
    "Item.SellingStatus.HighBidder.Site",
    "Item.SellingStatus.HighBidder.Status",
    "Item.SellingStatus.HighBidder.UserAnonymized",
    "Item.SellingStatus.HighBidder.UserID",
    "Item.SellingStatus.HighBidder.UserIDChanged",
    "Item.SellingStatus.HighBidder.UserIDLastChanged",
    "Item.SellingStatus.HighBidder.VATStatus",
    "Item.SellingStatus.LeadCount",
    "Item.SellingStatus.ListingStatus",
    "Item.SellingStatus.MinimumToBid",
    "Item.SellingStatus.PromotionalSaleDetails",
    "Item.SellingStatus.PromotionalSaleDetails.EndTime",
    "Item.SellingStatus.PromotionalSaleDetails.OriginalPrice",
    "Item.SellingStatus.PromotionalSaleDetails.StartTime",
    "Item.SellingStatus.QuantitySold",
    "Item.SellingStatus.QuantitySoldByPickupInStore",
    "Item.SellingStatus.ReserveMet",
    "Item.SellingStatus.SecondChanceEligible",
    "Item.ShippingDetails.CalculatedShippingDiscount",
    "Item.ShippingDetails.CalculatedShippingDiscount.DiscountName",
    "Item.ShippingDetails.CalculatedShippingDiscount.DiscountProfile",
    "Item.ShippingDetails.CalculatedShippingDiscount.DiscountProfile.DiscountProfileID",
    "Item.ShippingDetails.CalculatedShippingDiscount.DiscountProfile.DiscountProfileName",
    "Item.ShippingDetails.CalculatedShippingDiscount.DiscountProfile.MappedDiscountProfileID",
    "Item.ShippingDetails.CalculatedShippingDiscount.DiscountProfile.WeightOff",
    "Item.ShippingDetails.FlatShippingDiscount",
    "Item.ShippingDetails.FlatShippingDiscount.DiscountName",
    "Item.ShippingDetails.FlatShippingDiscount.DiscountProfile",
    "Item.ShippingDetails.FlatShippingDiscount.DiscountProfile.DiscountProfileID",
    "Item.ShippingDetails.FlatShippingDiscount.DiscountProfile.DiscountProfileName",
    "Item.ShippingDetails.FlatShippingDiscount.DiscountProfile.EachAdditionalAmount",
    "Item.ShippingDetails.FlatShippingDiscount.DiscountProfile.EachAdditionalAmountOff",
    "Item.ShippingDetails.FlatShippingDiscount.DiscountProfile.EachAdditionalPercentOff",
    "Item.ShippingDetails.InternationalCalculatedShippingDiscount",
    "Item.ShippingDetails.InternationalCalculatedShippingDiscount.DiscountName",
    "Item.ShippingDetails.InternationalCalculatedShippingDiscount.DiscountProfile",
    "Item.ShippingDetails.InternationalCalculatedShippingDiscount.DiscountProfile.DiscountProfileID",
    "Item.ShippingDetails.InternationalCalculatedShippingDiscount.DiscountProfile.DiscountProfileName",
    "Item.ShippingDetails.InternationalCalculatedShippingDiscount.DiscountProfile.MappedDiscountProfileID",
    "Item.ShippingDetails.InternationalCalculatedShippingDiscount.DiscountProfile.WeightOff",
    "Item.ShippingDetails.InternationalFlatShippingDiscount",
    "Item.ShippingDetails.InternationalFlatShippingDiscount.DiscountName",
    "Item.ShippingDetails.InternationalFlatShippingDiscount.DiscountProfile",
    "Item.ShippingDetails.InternationalFlatShippingDiscount.DiscountProfile.DiscountProfileID",
    "Item.ShippingDetails.InternationalFlatShippingDiscount.DiscountProfile.DiscountProfileName",
    "Item.ShippingDetails.InternationalFlatShippingDiscount.DiscountProfile.EachAdditionalAmount",
    "Item.ShippingDetails.InternationalFlatShippingDiscount.DiscountProfile.EachAdditionalAmountOff",
    "Item.ShippingDetails.InternationalFlatShippingDiscount.DiscountProfile.EachAdditionalPercentOff",
    "Item.ShippingDetails.PromotionalShippingDiscountDetails",
    "Item.ShippingDetails.PromotionalShippingDiscountDetails.DiscountName",
    "Item.ShippingDetails.PromotionalShippingDiscountDetails.ItemCount",
    "Item.ShippingDetails.PromotionalShippingDiscountDetails.OrderAmount",
    "Item.ShippingDetails.PromotionalShippingDiscountDetails.ShippingCost",
    "Item.ShippingDetails.SellerExcludeShipToLocationsPreference",
    //"Item.ShippingDetails.ShippingServiceOptions.ExpeditedService",
    //"Item.ShippingPackageDetails.ShippingPackage",
    "Item.ShippingDetails.CalculatedShippingRate.ShippingIrregular",
    "Item.ShippingDetails.CalculatedShippingRate.WeightMajor",
    "Item.ShippingDetails.CalculatedShippingRate.WeightMinor",
    "Item.ShippingDetails.ShippingServiceOptions.ShippingTimeMax",
    "Item.ShippingDetails.ShippingServiceOptions.ShippingTimeMin",
    "Item.ShippingDetails.TaxTable",
    "Item.ShippingDetails.TaxTable.TaxJurisdiction",
    "Item.ShippingDetails.TaxTable.TaxJurisdiction.JurisdictionID",
    "Item.ShippingDetails.TaxTable.TaxJurisdiction.SalesTaxPercent",
    "Item.ShippingDetails.TaxTable.TaxJurisdiction.ShippingIncludedInTax",
    "Item.Storefront.StoreURL",
    "Item.TimeLeft",
    "Item.Variations.Pictures",
    "Item.Variations.Pictures.VariationSpecificName",
    "Item.Variations.Pictures.VariationSpecificPictureSet",
    "Item.Variations.Pictures.VariationSpecificPictureSet.ExtendedPictureDetails.PictureURLs.eBayPictureURL",
    "Item.Variations.Pictures.VariationSpecificPictureSet.ExtendedPictureDetails.PictureURLs.ExternalPictureURL",
    "Item.Variations.Pictures.VariationSpecificPictureSet.PictureURL",
    "Item.Variations.Pictures.VariationSpecificPictureSet.VariationSpecificValue",
    "Item.Variations.Variation.DiscountPriceInfo",
    "Item.Variations.Variation.DiscountPriceInfo.MadeForOutletComparisonPrice",
    "Item.Variations.Variation.DiscountPriceInfo.MinimumAdvertisedPrice",
    "Item.Variations.Variation.DiscountPriceInfo.MinimumAdvertisedPriceExposure",
    "Item.Variations.Variation.DiscountPriceInfo.OriginalRetailPrice",
    "Item.Variations.Variation.DiscountPriceInfo.PricingTreatment",
    "Item.Variations.Variation.DiscountPriceInfo.SoldOffeBay",
    "Item.Variations.Variation.DiscountPriceInfo.SoldOneBay",
    "Item.Variations.Variation.SellingStatus.HighBidder.AboutMePage",
    "Item.Variations.Variation.SellingStatus.HighBidder.BuyerInfo",
    "Item.Variations.Variation.SellingStatus.HighBidder.BuyerInfo.ShippingAddress",
    "Item.Variations.Variation.SellingStatus.HighBidder.BuyerInfo.ShippingAddress.Country",
    "Item.Variations.Variation.SellingStatus.HighBidder.BuyerInfo.ShippingAddress.FirstName",
    "Item.Variations.Variation.SellingStatus.HighBidder.BuyerInfo.ShippingAddress.LastName",
    "Item.Variations.Variation.SellingStatus.HighBidder.BuyerInfo.ShippingAddress.PostalCode",
    "Item.Variations.Variation.SellingStatus.HighBidder.eBayGoodStanding",
    "Item.Variations.Variation.SellingStatus.HighBidder.Email",
    "Item.Variations.Variation.SellingStatus.HighBidder.FeedbackPrivate",
    "Item.Variations.Variation.SellingStatus.HighBidder.FeedbackRatingStar",
    "Item.Variations.Variation.SellingStatus.HighBidder.FeedbackScore",
    "Item.Variations.Variation.SellingStatus.HighBidder.IDVerified",
    "Item.Variations.Variation.SellingStatus.HighBidder.NewUser",
    "Item.Variations.Variation.SellingStatus.HighBidder.RegistrationAddress",
    "Item.Variations.Variation.SellingStatus.HighBidder.RegistrationAddress.CityName",
    "Item.Variations.Variation.SellingStatus.HighBidder.RegistrationAddress.Country",
    "Item.Variations.Variation.SellingStatus.HighBidder.RegistrationAddress.CountryName",
    "Item.Variations.Variation.SellingStatus.HighBidder.RegistrationAddress.FirstName",
    "Item.Variations.Variation.SellingStatus.HighBidder.RegistrationAddress.LastName",
    "Item.Variations.Variation.SellingStatus.HighBidder.RegistrationAddress.Name",
    "Item.Variations.Variation.SellingStatus.HighBidder.RegistrationAddress.Phone",
    "Item.Variations.Variation.SellingStatus.HighBidder.RegistrationAddress.PostalCode",
    "Item.Variations.Variation.SellingStatus.HighBidder.RegistrationAddress.Street",
    "Item.Variations.Variation.SellingStatus.HighBidder.RegistrationAddress.Street1",
    "Item.Variations.Variation.SellingStatus.HighBidder.RegistrationAddress.Street2",
    "Item.Variations.Variation.SellingStatus.HighBidder.RegistrationDate",
    "Item.Variations.Variation.SellingStatus.HighBidder.Site",
    "Item.Variations.Variation.SellingStatus.HighBidder.Status",
    "Item.Variations.Variation.SellingStatus.HighBidder.UserAnonymized",
    "Item.Variations.Variation.SellingStatus.HighBidder.UserID",
    "Item.Variations.Variation.SellingStatus.HighBidder.UserIDChanged",
    "Item.Variations.Variation.SellingStatus.HighBidder.UserIDLastChanged",
    "Item.Variations.Variation.SellingStatus.HighBidder.VATStatus",
    "Item.Variations.Variation.SellingStatus.PromotionalSaleDetails.EndTime",
    "Item.Variations.Variation.SellingStatus.PromotionalSaleDetails.OriginalPrice",
    "Item.Variations.Variation.SellingStatus.PromotionalSaleDetails.StartTime",
    "Item.Variations.Variation.SellingStatus.QuantitySold",
    "Item.Variations.Variation.SellingStatus.QuantitySoldByPickupInStore",
    "Item.Variations.Variation.StartPrice",
    "Item.Variations.Variation.VariationProductListingDetails",
    "Item.Variations.Variation.VariationProductListingDetails.EAN",
    "Item.Variations.Variation.VariationProductListingDetails.ISBN",
    "Item.Variations.Variation.VariationProductListingDetails.UPC",
    "Item.Variations.Variation.VariationSpecifics",
    "Item.Variations.Variation.VariationSpecifics.NameValueList",
    "Item.Variations.Variation.VariationSpecifics.NameValueList.Name",
    "Item.Variations.Variation.VariationSpecifics.NameValueList.Value",
    "Item.Variations.VariationSpecificsSet",
    "Item.Variations.VariationSpecificsSet.NameValueList",
    "Item.Variations.VariationSpecificsSet.NameValueList.Name",
    "Item.Variations.VariationSpecificsSet.NameValueList.Source",
    "Item.Variations.VariationSpecificsSet.NameValueList.Value",
    "Item.VATDetails.VATID",
    "Item.VATDetails.VATSite",
    "Item.WatchCount"

]


