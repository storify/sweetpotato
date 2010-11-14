//setup Dependencies
require(__dirname + "/lib/setup").ext( __dirname + "/lib").ext( __dirname + "/lib/express/support");
var connect = require('connect')
  , express = require('express')
  , sys = require('sys')
  , io = require('Socket.IO-node')
  , hbs = require('hbs')
  , _ = require('underscore')
  , OAuth = require('oauth').OAuth
  , mongoose = require('mongoose').Mongoose
  , fs = require('fs')
  , port = 8081 ;

//Setup Mongoose
var db = mongoose.connect('mongodb://localhost:27017/SweetPotato');
mongoose.model('Potato', {
	collection  : 'potatoes',
	properties  : ['msg','to','from','hashtag','category','created_at','completed_at','yam'],
	indexes 	: ['to','completed_at','created_at','category']
});
db.potatoes = db.model('Potato');

//Connect to Yammer using oAuth
var CONSUMER_KEY 	= 'XBuNUfGpJUe0PLm3CF0EQ',
	CONSUMER_SECRET	= 'JwAONX6O7aHVcHLHfXbxprwUaEvZjzpq8SUCLdfhSB4';
	
var oa = new OAuth( 'https://www.yammer.com/oauth/request_token',
					'https://www.yammer.com/oauth/access_token',
					CONSUMER_KEY,CONSUMER_SECRET,
					'1.0',null,'HMAC-SHA1');

//Setup Express
var server = express.createServer();
server.configure(function(){
  server.set('views', __dirname + '/views');
  server.use(connect.bodyDecoder());
  server.use(connect.staticProvider(__dirname + '/static'));
  server.use(server.router);
  server.set("view engine", "hbs");
});

//setup the errors
server.error(function(err, req, res, next){
  if (err instanceof NotFound) {
    res.render('404.hbs', { locals: {
        title : 'SweetPotato - 404'
       ,description: 'Bake your to do\'s'
       ,author: 'Storify'
        },status: 404 });
  } else {
    res.render('500.hbs', { locals: {
          title : 'SweetPotato - Server Error'
         ,description: 'Bake your to do\'s'
         ,author: 'Storify'
         ,error: err 
        },status: 500 });
  }
});
server.listen( port);

var jsonPotato = {
   "msg"        : "Send this through a socket"
  ,"to"         : "@dshaw"
  ,"from"       : "@derickson"
  ,"hashtag"    : "#11"
  ,"created_at" : new Date().getTime()
  ,"category"   : "feature"
}

var potato = JSON.stringify(jsonPotato);

//Setup Socket.IO
var io = io.listen(server);
io.on('connection', function(client){
	console.log('Client Connected');
	client.on('message', function(message){
		client.broadcast(message);
		client.send(message);
	});
  client.send(potato);
	client.on('disconnect', function(){
		console.log('Client Disconnected.');
	});
});

///////////////////////////////////////////
//        Routes           //
///////////////////////////////////////////

/////// ADD ALL YOUR ROUTES HERE  /////////

server.get('/', function(req,res){
  res.render('index.hbs', {
  locals : {
        title : 'SweetPotato'
       ,description: 'Bake your to do list.'
       ,author: 'Storify'
      }
  });
});

var debug = function(str,obj) {
	var r = (obj) ? str+' '+sys.inspect(obj) : str;
	console.log(r);
}

var config = JSON.parse(fs.readFileSync("./config.json","utf8"));

var oauth_credentials = config.oauth_credentials || {};

server.get('/auth',function(req,res) {
	oa.getOAuthRequestToken(function(error,oauth_token,oauth_token_secret,results) {
		if(error) {
			debug('error:',error);
		}
		else {
			oauth_credentials = {token: oauth_token, secret: oauth_token_secret};
			var endpoint = 'https://www.yammer.com/oauth/authorize?oauth_token='+oauth_token;
			debug('redirecting to '+endpoint);
			res.redirect(endpoint);
		}
	});
});



server.get('/oauth/access_token',function(req,res) {
	var oauth_verifier = req.param('oauth_verifier');
	debug('Using oauth_verifier: '+oauth_verifier,oauth_credentials);
	oa.getOAuthAccessToken(oauth_credentials.token,oauth_credentials.secret,oauth_verifier,function(error, oauth_access_token, oauth_access_token_secret,results) {
		if(error) {
			debug('error: ',error);
		}
		else {
			oauth_credentials.access_token 			= oauth_access_token;
			oauth_credentials.access_token_secret 	= oauth_access_token_secret;
			debug('Yeah: ',oauth_credentials);
		}
	})
});

var max_id = 0;

get_latest_yams = function(newer_than_id,callback) {
	oa.get('https://www.yammer.com/api/v1/messages.json?newer_than='+max_id,oauth_credentials.access_token,oauth_credentials.access_token_secret,function(err,json) {
		var feed = JSON.parse(json);
		//debug('json: ',feed);
		
		
		var references = feed.references;
		
		var userInfo = {};
		for (var i in references) {
			if(references[i].type=='user') {
				userInfo[references[i].id] = references[i];
			}
		}
		
		var r = [];
		for (var i in feed.messages) {
			var result = feed.messages[i];
			max_id = (result.id > max_id) ? result.id : max_id;
			result.from = '@'+userInfo[result.sender_id].name;
			r.push(result);
		}
		return callback(r);
	});
}

setInterval(function() {
	debug('get_latest_yams('+max_id+')');
	get_latest_yams(max_id,function(yams) {
		for (var i=0, len=yams.length; i < len; i++) {
			var msg = yams[i].body.plain;
			
			if((category=msg.match(/(#[a-z]{1,10})/i)) && (to = msg.match(/(@[a-z0-9]{1,15})/i))) {
				debug('Adding message :\t'+msg);
				
				var potato = new db.potatoes({
					yam 		: yams[i],
					to			: to[1],
					from		: yams[i].from,
					category	: category[1],
					created_at	: new Date(yams[i].created_at)
				});
				
				potato.save();
			}
		};	
	});	
},1000*30);



//A Route for Creating a 500 Error (Useful to keep around)
server.get('/500', function(req, res){
  throw new Error('This is a 500 Error');
});

//The 404 Route (ALWAYS Keep this as the last route)
server.get('/*', function(req, res){
  throw new NotFound;
});

function NotFound(msg){
  this.name = 'NotFound';
  Error.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
}


console.log('Listening on http://0.0.0.0:' + port );
