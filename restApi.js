// Module dependencies.
var application_root = __dirname,
    express = require( 'express' ), //Web framework
    path = require( 'path' ),           //Utilities for dealing with file paths
    fs   = require( 'fs' ),
    // mongoskin = require('mongoskin'),
    bodyParser = require('body-parser'),
    mongoose = require( 'mongoose' ),
    bson = require('bson');

//Create server
var app = express();

// Configure server
// app.configure( function() {
    // //parses request body and populates request.body
    // app.use( express.bodyParser() );

    // //checks request.body for HTTP method overrides
    // app.use( express.methodOverride() );

    // //perform route lookup based on url and HTTP method
    // app.use( app.router );

    // //Show all errors in development
    // app.use( express.errorHandler({ dumpExceptions: true, showStack: true }));
// });


//Connect to database
//var db = mongoose.connect('mongodb://127.0.0.1:27017/test');
if(process.env.VCAP_SERVICES){
  var services = JSON.parse(process.env.VCAP_SERVICES);
  var dbcreds = services['mongodb'][0].credentials;
}

if(dbcreds){
  console.log(dbcreds);
  // mongoose.connect(dbcreds.host, "test", dbcreds.port);
  mongoose.connect(dbcreds.host, dbcreds.db, dbcreds.port, {user: dbcreds.username, pass: dbcreds.password});

}else{
  mongoose.connect("127.0.0.1", "test", 27017);
}

//Schema
var UsersSchema = new mongoose.Schema({
    name: String,
    score: Number
});

//Model
mongoose.model( 'Users', UsersSchema );

var User = mongoose.model('Users');

//app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use( bodyParser.json( { extended: true } ));
app.use( bodyParser.urlencoded() ); // to support URL-encoded bodies


app.use(express.static(__dirname + '/public'));

// global varible
var cache;

//Router
app.all('*', function(req, res, next){
  if (!req.get('Origin')) return next();
  // use "*" here to accept any origin
  res.set('Access-Control-Allow-Origin', 'http://localhost');
  // res.set('Access-Control-Allow-Methods', 'GET');
  // res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  // res.set('Access-Control-Allow-Max-Age', 3600);
  // if ('OPTIONS' == req.method) return res.send(200);
  next();
});


// return the view page, a problem to load script.
app.get( '/', function(req, res){
	if(cache == null)
	{
		var indexFile = './public/index.html';
		fs.exists( indexFile, function(exists){
			if(exists){
				fs.readFile(indexFile, function(err, data){
					if(err){
						res.statusCode = 404;
						res.end('page not found!');
					}
					else{
						cache = data;
						res.setHeader( 'content-type', 'text/html' );
						res.statusCode = 200;
						res.end(cache);							
					}
				})
			}
			else{
				res.statusCode = 404;
				res.end('page not found!');
			}
		})
	}
	else{
		res.setHeader( 'content-type', 'text/html' );
		res.statusCode = 200;
		res.end(cache);			
	}
})


//Get a single user info by user name - TBD
app.get( '/api/users/:id', function( request, response ) {
    var user = {
        name: "John Wu",
        score: "80",
    };
    
    response.send(user);
});


//Get the rank of user
app.get( '/api/users', function( request, response ) {

	var user = new User();
	var curName =  user.name  = request.query['name'];
	var curScore = user.score = request.query['score'];

	user.save( function(err){
		if(err){
			console.log(err);
			response.status(500).send('Insert record to database failed!');
		}
		else{
			User.find({}, function(err, users){
				if(err){
					console.log(err);
					response.status(500).send('Get record from database failed!');
				}
				else{
					var ranking = 0;
					var userNo = users.length;
					for( var i = 0; i < userNo; i++ ){
						if( users[i].score > curScore )
							++ranking;
					}
					response.status(200).send( 'you defeated ' + ranking + ' people!' );
				}
			})
		}
	})
});

// Post a record, and return the rank info.
app.post( '/api/users', function( request, response ) {
	var user = new User();
	// failed to get the name and score？
	var curName  = user.name  = request.body.name;
	var curScore = user.score = request.body.score;

	user.save( function(err){
		if(err){ 
			console.log(err);
			response.status(500).send('Server is wrong.');
		}
		else{ // get the ranking of the user, and send it back.
			User.find({}, function(err, users){
				if(err){
					console.log(err);
					response.status(500).send('Server is wrong.');
				}
				else{
					var ranking = 0;
					var userNo = users.length;
					for( var i = 0; i < userNo; i++ ){
						if( users[i].score > curScore )
							++ranking;
					}
					response.status(200).send( curName+' defeated ' + ranking + ' people!' );
				}
			});
			console.log('created..');
		}
	});
});


//Update a user - TBD
app.put( '/api/users/:id', function( request, response ) {
    response.send("Updated!");
});

//Delete a user - TBD
app.delete( '/api/users/:id', function( request, response ) {
    response.send("Deleted");
});

//Start server
//var port = 4711;
var port = process.env.VCAP_APP_PORT || 4711;

app.listen( port, function() {
    console.log( 'Express server listening on port %d in %s mode', port, app.settings.env );
});
