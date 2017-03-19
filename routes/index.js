'use strict';

var paypal = require('paypal-rest-sdk');
var config = {};
var ebay = require('ebay-api');
var userToken = "";

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var all_items = null;
var config = require('./config.js'), //config file contains all tokens and other private info
    funct = require('./functions.js'); //funct file contains our helper functions for our Passport and database work

var express = require('express'),
    exphbs  = require('express-handlebars'),
    passport = require('passport'),
    LocalStrategy = require('passport-local'),
    TwitterStrategy = require('passport-twitter'),
    GoolgeStrategy = require('passport-google'),
    FacebookStrategy = require('passport-facebook');
// need to change to amazon cloud serveice
//mongoose.connect('mongodb://localstoriz:prime199@ds147497.mlab.com:47497/localstoriz');

mongoose.connect('mongodb://127.0.0.1:27017/db');
var userDataSchema = new Schema({
    token: {type: String, required: true},
    id_list : { type : Array , "default" : [] }
}, {collection: 'user-data'});
var UserData = mongoose.model('UserData', userDataSchema);

// Routes

exports.index = function (req, res) {
  res.render('index');
};

exports.create = function (req, res) {
    var method = req.param('method');
    var item_token = req.param('item_token');
    userToken =  item_token;

    var payment = {
		"intent": "sale",
		"payer": {
		},
		"transactions": [{
			"amount": {
                "total": "1.00",
                "currency": "USD"
			},
            "description": "My awesome payment"
		}]
	};
	console.log(userToken);

	if (method === 'paypal') {
		payment.payer.payment_method = 'paypal';
		payment.redirect_urls = {
			"return_url": "http://localhost:3000/execute",
			"cancel_url": "http://localhost:3000/cancel"
		};
	}
	//
	// else if (method === 'credit_card') {
	// 	var funding_instruments = [
	// 		{
	// 			"credit_card": {
	// 				"type": req.param('type').toLowerCase(),
	// 				"number": req.param('number'),
	// 				"expire_month": req.param('expire_month'),
	// 				"expire_year": req.param('expire_year'),
	// 				"first_name": req.param('first_name'),
	// 				"last_name": req.param('last_name')
	// 			}
	// 		}
	// 	];
	// 	payment.payer.payment_method = 'credit_card';
	// 	payment.payer.funding_instruments = funding_instruments;
	// }

    var d = new Date();
    // searching all items 3 month ago .
    var newd = new Date();
    // newd.setMonth(newd.getMonth()-2);
    newd.setHours(newd.getDay())
    ebay.xmlRequest({
        serviceName : 'Trading',
        opType : 'GetSellerList',

        // app/environment
        devId: '9237dc03-c040-489b-853c-4a945c1bb788',
        certId: 'shaybar-shaytest-SBX-4cd475433-571f7021',
        appId: 'SBX-cd4754332a2b-8abc-4b44-81f4-35b3',
        sandbox: true,
        // per user
        authToken: item_token,
        params: {
            // StartTimeFrom:newd.toISOString(),
			// StartTimeTo:d.toISOString()
            EndTimeFrom:newd

        }
    }, function(error, results) {
        if (error) {
            console.log(error.errors[0]['ShortMessage']);
            // can send also all json by error .
            res.render('error', {'error': error.errors[0]['ShortMessage']});
            all_items = null;
        }
        else {
            all_items = results;
            paypal.payment.create(payment, function (error, payment) {
                if (error) {
                    console.log(error);
                    res.render('error', { 'error': error });
                } else {
                    req.session.paymentId = payment.id;
                    // res.render('create', { 'payment': payment });
                    var redirectUrl;
                    for(var i=0; i < payment.links.length; i++) {
                        var link = payment.links[i];
                        if (link.method === 'REDIRECT') {
                            redirectUrl = link.href;
                        }
                    }
                    res.redirect(redirectUrl);
                }
            });
        }
    });
};

exports.checkListExpiration = function (req,res){

    var token_item = req.param('token');





}







exports.execute = function (req, res) {

	// var TokenUser = userToken;
	var token_item = req.param('token');
    var item_token = req.param('item_token');
    var paymentId = req.session.paymentId;
	var payerId = req.param('PayerID');

	var details = { "payer_id": payerId };
	var payment = paypal.payment.execute(paymentId, details, function (error, payment) {
		if (error || all_items==null) {
			if (all_items == null ){
				error = "no items in ebay token";
			}
			console.log(error);
			res.render('error', { 'error': error });
		}
		else {
		// if payment succeded !!!
            var item = {
                token: userToken,
                id_list:all_items.Items
            };
            var data = new UserData(item);
            data.save();
			res.render('execute', { 'payment': payment, 'userToken':userToken});
		}
	});
};

exports.cancel = function (req, res) {
  res.render('cancel');
};

// Configuration

exports.init = function (c) {
	config = c;
	paypal.configure(c.api);
};

var taskA = function(){
    var stream = UserData.find().stream();

  //   stream.on('data', function (doc) {
  //   	if (doc._doc.token){
  // //  		console.log(doc._doc.token);
	// 		(doc._doc['id_list']).forEach(function(item) {
  //           	ebay.xmlRequest({
  //       		serviceName : 'Trading',
  //       		opType : 'GetItem',
  //
  //       // app/environment
  //       		devId: '9237dc03-c040-489b-853c-4a945c1bb788',
  //       		certId: 'shaybar-shaytest-SBX-4cd475433-571f7021',
  //       		appId: 'SBX-cd4754332a2b-8abc-4b44-81f4-35b3',
  //       		sandbox: true,
  //       // per user
  //       		authToken: doc._doc.token,
	// 				params: {
  //                       ItemID: item.ItemID
  //       		}
  //   				}, function(error, results) {
  // //      				console.log(results);
  //   						});
  //
  //           });
  //   	}
  //       // do something with the mongoose document
  //   }).on('error', function (err) {
  //       // handle the error
  //   }).on('close', function () {
  //   	console.log ("###### finished all mongodb vars");
  //       // the stream is closed
  //   });

};

// function addAllItems(token){
//     var d = new Date();
//     // searching all items 3 month ago .
//     var newd = new Date(d.getFullYear(),d.getMonth()-3,d.getDay());
//     ebay.xmlRequest({
//         serviceName : 'Trading',
//         opType : 'GetSellerList',
//
//         // app/environment
//         devId: '9237dc03-c040-489b-853c-4a945c1bb788',
//         certId: 'shaybar-shaytest-SBX-4cd475433-571f7021',
//         appId: 'SBX-cd4754332a2b-8abc-4b44-81f4-35b3',
//         sandbox: true,
//         // per user
//         authToken: token,
//         params: {
//             StartTimeFrom:newd.toISOString(),
//             StartTimeTo:d.toISOString()
//         }
//     }, function(error, results) {
//         console.log(results);
//     });
// };

// change it to 24 hours !
setInterval(taskA,10000);