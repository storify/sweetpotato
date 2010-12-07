// setup Dependencies
require(__dirname + "/lib/setup").ext( __dirname + "/lib").ext( __dirname + "/lib/express/support");
var connect = require('connect')
  , express = require('express')
  , sys = require('sys')
  , io = require('Socket.IO-node')
  , hbs = require('hbs')
  , _ = require('underscore').underscore
  , OAuth = require('oauth').OAuth
  , mongoose = require('mongoose').Mongoose
  , fs = require('fs')
  , config = JSON.parse(fs.readFileSync("./config.json","utf8"))
  , max_id = 0
  , port = 8081 ;

// Setup Mongoose
// Connect to the Mongo Server
var db = mongoose.connect('mongodb://localhost:27017/SweetPotato');
// Create the Potato model
mongoose.model('Potato', {
	collection  : 'potatoes',
	properties  : ['id','msg','to','from','hashtag','category','created_at','completed_at','yam'],
	indexes 	  : ['id','to','completed_at','created_at','category']
});
db.potatoes = db.model('Potato');

// Connect to Yammer using oAuth
var oauth_credentials = config.oauth_credentials || {};

var oa = new OAuth(
  'https://www.yammer.com/oauth/request_token',
  'https://www.yammer.com/oauth/access_token',
	config.CONSUMER_KEY,
	config.CONSUMER_SECRET,
	'1.0',null,'HMAC-SHA1'
);

// Setup Express
var server = express.createServer();
server.configure(function(){
  server.set('views', __dirname + '/views');
  server.use(connect.bodyDecoder());
  server.use(connect.staticProvider(__dirname + '/static'));
  server.use(server.router);
  server.set("view engine", "hbs");
});

// setup the errors
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
// Listen on the port assigned above
server.listen(port);

///////////////////////////////////////////
//        Utils           //
///////////////////////////////////////////

/////// ADD ALL YOUR UTILITY FUNCTIONS HERE  /////////

// A util function to help output strings and variables to the console
var debug = function(str,obj) {
	var r = (obj) ? str+' '+sys.inspect(obj) : str;
	console.log(r);
}

function linkify(text) {
	if( !text ) return text;
	
	text = text.replace(/((https?\:\/\/|ftp\:\/\/)|(www\.))(\S+)(\w{2,4})(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/gi,function(url){
		nice = url;
		if( url.match('^https?:\/\/') )
		{
			nice = nice.replace(/^https?:\/\//i,'')
		}
		else
			url = 'http://'+url;
		
		
		return '<a target="_blank" rel="nofollow" href="'+ url +'">'+ nice.replace(/^www./i,'') +'</a>';
	});
	
	return text;
}

// A function to find all stored Potatoes and send them via Socket.io to the client
function sendStoredPotatoes(client){
  db.potatoes.find().sort([['created_at','ascending']]).all(function(potatoes){
    for (p in potatoes) {
      potatoes[p].msg = potatoes[p].yam.body.plain.replace(potatoes[p].to,'').replace(potatoes[p].category,'');
      client.send(JSON.stringify({
        to        :   potatoes[p].to,
        from      :   potatoes[p].from,
        msg       :   linkify(potatoes[p].msg),
        category  :   potatoes[p].category,
        created_at:   potatoes[p].created_at,
        hashtag   :   potatoes[p].hashtag
      }));
    }
  });
}

///////////////////////////////////////////
//        Socket.io          //
///////////////////////////////////////////

// Setup Socket.IO and send all stored Potatoes upon connection
var io = io.listen(server);
io.on('connection', function(client){
	console.log('Client Connected');
	sendStoredPotatoes(client);
	client.on('message', function(message){
		client.broadcast(message);
		client.send(message);
	});
	client.on('disconnect', function(){
		console.log('Client Disconnected.');
	});
});

///////////////////////////////////////////
//        Routes           //
///////////////////////////////////////////

/////// ADD ALL YOUR ROUTES HERE  /////////

// Our one and only user facing route, this sets up the filter menu, gets us hooked into Socket.io and listens for new Potatoes
server.get('/', function(req,res){
  db.potatoes._collection.distinct("to",function(err,toUsers){
    for (var i in toUsers) {
      toUsers[i] = toUsers[i].replace("@",'');
    }
    db.potatoes._collection.distinct("from",function(err,fromUsers){
      for (var i in fromUsers) {
        fromUsers[i] = fromUsers[i].replace("@",'');
      }
      res.render('index.hbs', {
        locals : {
          to_users    : toUsers
         ,from_users  : fromUsers
         ,title       : 'SweetPotato'
         ,description : 'Bake your to do list.'
         ,author      : 'Storify'
        }
      });
    });
  });
});

// TODO @xdamman || @dshaw: Please document this route
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

// TODO @xdamman || @dshaw: Please document this route
server.get('/oauth/access_token',function(req,res) {
	var oauth_verifier = req.param('oauth_verifier');
	debug('Using oauth_verifier: '+oauth_verifier,oauth_credentials);
	oa.getOAuthAccessToken(oauth_credentials.token,oauth_credentials.secret,oauth_verifier,function(error, oauth_access_token, oauth_access_token_secret,results) {
		if(error) {
			debug('error: ',error);
		}
		else {
			oauth_credentials.access_token        = oauth_access_token;
			oauth_credentials.access_token_secret = oauth_access_token_secret;
			debug('Yeah: ',oauth_credentials);
		}
	})
});

// TODO @xdamman || @dshaw: Please document this function
get_latest_yams = function(newer_than_id,callback) {
	oa.get('https://www.yammer.com/api/v1/messages.json?newer_than='+max_id,oauth_credentials.access_token,oauth_credentials.access_token_secret,function(err,json) {
		var feed = JSON.parse(json);
		
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

// Check Yammer for new Yams every 30 seconds, if there are any, check to see if they are Potatoes
// If they are a Potatoes, save them to mongo and broadcast them to the clients 
db.potatoes.find().sort([['id','descending']]).first(function(p) {
	max_id = (p && p.id > 0) ? p.id : 0;
	debug('max_id: '+max_id);
	setInterval(function() {
		get_latest_yams(max_id,function(yams) {
			for (var i=0, len=yams.length; i < len; i++) {
				var msg = yams[i].body.plain;
        
        var to = msg.match(/(@[a-z0-9]{1,15})/i) || ["","@unassigned"];

				if((category=msg.match(/(#(feature|bug|todo))/i))) {
					debug('Adding message :\t'+msg);
          var plainPotato = {
						id			    : yams[i].id,
						yam 		    : yams[i],
						to			    : to[1],
						from		    : yams[i].from,
						category	  : category[1],
						created_at	: new Date(yams[i].created_at),
						msg         : yams[i].body.plain
					};

					var potato = new db.potatoes(plainPotato);

					potato.save();
					
					plainPotato.msg = linkify(plainPotato.msg.replace(plainPotato.to,'').replace(plainPotato.category,''));
					
					io.broadcast(JSON.stringify(plainPotato));
				}
			};	
		});	
	},1000*10);
});

// A Route for Creating a 500 Error (Useful to keep around)
server.get('/500', function(req, res){
  throw new Error('This is a 500 Error');
});

// The 404 Route (ALWAYS Keep this as the last route)
server.get('/*', function(req, res){
  throw new NotFound;
});

// Create the not found error
function NotFound(msg){
  this.name = 'NotFound';
  Error.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
}


console.log('Listening on :' + port );
