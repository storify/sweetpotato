//setup Dependencies
require(__dirname + "/lib/setup").ext( __dirname + "/lib").ext( __dirname + "/lib/express/support");
var connect = require('connect')
  , express = require('express')
  , sys = require('sys')
  , io = require('Socket.IO-node')
  , hbs = require('hbs')
  , _ = require('underscore')
  , port = 8081 ;

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
