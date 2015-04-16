
console.log('Starting up...');

var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var AWS = require('aws-sdk'); // Credentials in ENV vars

var s3 = new AWS.S3();
AWS.config.region = 'us-east-1';
//AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: process.env.AWS_PROFILE});

console.log('AWS.config:');
console.dir(AWS.config);
if (AWS.config.credentials === null) {
	console.log('Missing AWS credentials. Check your environment vars!');
	process.exit(1);
}
var config = require('./config.js');
console.dir(config);
console.log('Configuration complete.');

// App
var app = express();
app.engine('.html', require('ejs').renderFile);

//var access_logfile = require('fs').createWriteStream(config.tempPath + '/access.log', {flags: 'a'});
app.use(require('morgan')('combined', {immediate: true})); //access logging

// Request body parsing:
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
var getRawBody = require('raw-body')
var typer = require('media-typer')
app.use(function (req, res, next) {
  getRawBody(req, 
    'utf8',
  //{
    //length: req.headers['content-length'],
    //limit: '1mb',
    //encoding: typer.parse(req.headers['content-type']).parameters.charset
  //},
  function (err, string) {
    if (err) {
      return next(err)
    }
    req.text = string
    next()
  })
});

app.get('/', function (req, res) {
	console.log('Serving homepage.');
	res.render('index.html');
});

var passport = require('passport');
var CourseraStrategy = require('./passport-coursera.js');
passport.use(new CourseraStrategy(
  {
    clientID: process.env.COURSERA_CLIENT_ID,
    clientSecret: process.env.COURSERA_CLIENT_SECRET,
    callbackURL: config.publicUrl + "/auth/coursera/callback"
  },
  	// Verify
	function(accessToken, refreshToken, profile, done) {
	  process.nextTick(function() {
      console.log('CourseraStrategy Verify callback');
	// Do something here to get user info based on the OAuth response.
      console.dir([accessToken, refreshToken, profile]);
      // Then call done(error,user) to continue.
      return done(null, {accessToken : accessToken});
	  });
    }
));
passport.serializeUser(function(user, done) {
	console.log('Serialize user:');
	done(null, user);
});
passport.deserializeUser(function(obj, done) {
	console.log('De-serialize user:');
	console.dir(obj);
	done(null, obj);
});
var session = require('express-session');
//TODO: app.set('trust proxy', 1); // For HTTPS/proxy cookie support.
app.use(session({
	genid: function(req) {
		return require('crypto').randomBytes(48).toString('hex'); // unique session IDs
	},
	resave: false,
	saveUninitialized: true,
	secret: 'keyboard cat',
	//TODO: secret: require('crypto').randomBytes(48).toString('hex');
	//TODO: cookie: { secure: true }
	//TODO: store: require('connect-mongo')(session)()
	//TODO: store: require('session-file-store')(session)()
})); // This Express session must come before the Passport session below. 
app.use(passport.initialize());
app.use(passport.session());
//TODO: Need this for sessions? app.use(require('cookie-parser')());
// From https://github.com/jaredhanson/passport-github/
var ensureAuthenticated = function(req, res, next) {
	if (req.isAuthenticated()) {
		console.log('Allowing authenticated user.');
		return next();
	} else {
		console.log('Redirecting unauthenticated user.');
		res.redirect('/login');
	}
};
app.get('/login', function (req, res) {
        res.send('<a href="/auth/coursera">Log in using Coursera</a>');
});
app.get('/loginok', function (req, res) {
        console.log('Login OK.');
        console.dir(req.user);
        res.render('index.html');
});
app.get('/loginfail', function (req, res) {
        console.log('Login FAILED.');
        res.render('index.html');
});
//Start the auth:
// If you get a 400:invalid_redirect_uri, make sure what you have in your browser matches config.publicUrl.
app.get('/auth/coursera', 
	passport.authenticate('coursera', {scope: 'view_profile'}));

app.get('/auth/coursera/callback',
	//passport.authenticate('coursera', { successRedirect: '/loginok', failureRedirect: '/loginfail' }));
	function(req, res, next) {
		passport.authenticate('coursera',
			function(err, user, info) {
				if (err) { return next(err); }
				if (!user) { return res.redirect('/loginfail'); }
				//Note: passport.authenticate() middleware invokes req.login() automatically.
				req.logIn(user, function(err) {
					if (err) { return next(err); }
					return res.redirect('/loginok?user=' + user.username);
				});
			})(req, res, next);
	});

app.get('/logout', function(req, res){
  console.log('logout');
  req.logout();
  res.redirect('/');
});

app.get('/list', ensureAuthenticated, function (req, res) {
	s3.listBuckets().on('complete', function(response) {
		console.log(response.data);
		console.log(response.error);
		res.send(response.data);
	}).send();
});

app.get('/ec2', ensureAuthenticated, function (req, res) {
	console.log('EC2:');
	var request = new AWS.EC2().describeInstances();
	request.on('success', function(resp) {
		console.log(resp.data);
		res.send(resp.data);
	});
	request.send();
});

app.get('/in', ensureAuthenticated, function (req, res) {
	var s3 = new AWS.S3({params: {Bucket: config.inputBucket}});
	s3.listObjects().on('complete', function(response) {
		console.log(response.data);
		console.log(response.error);
		res.send(response.data);
	}).send();
});

function cmd_exec(cmd, args, cb_stdout, cb_end) {
	var spawn = require('child_process').spawn,
	child = spawn(cmd, args),
	me = this;
	me.exit = 0;  // Send a cb to set 1 when cmd exits
	child.stdout.on('data', function (data) { cb_stdout(me, data) });
	child.stdout.on('end', function () { cb_end(me) });
}

app.get('/upload', function (req, res) {
	var filename = req.query.filename;
	var filepath = path.join(config.tempPath, filename);
	console.log('Trying to upload local file "'+filepath+'" to S3 as "'+filename+'"');

	var s3cmd = new cmd_exec('s3cmd', ['put', filepath, 's3://'+config.inputBucket],
		function (me, data) {me.stdout += data.toString();},
		function (me) {me.exit = 1;}
	);
	res.send(s3cmd.stdout);
});


app.get('/download', function (req, res) {
        var filename = req.query.filename;
        var filepath = path.join(config.tempPath, filename);
        console.log('Trying to download to local file "'+filepath+'" from  S3 key "'+filename+'"');
        var client = require('s3').createClient({s3Client: new AWS.S3()});
        var params = {
                localFile: filepath,
                s3Params: {
                        Bucket: config.outputBucket,
                        Key: filename,
                        // other options supported by putObject, except Body and ContentLength.
                        // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
		},
	};
	var downloader = client.downloadFile(params);
	downloader.on('error', function(err) {
		console.error("unable to download:", err.stack);
	});
	downloader.on('progress', function() {
		console.log("progress", downloader.progressAmount, downloader.progressTotal);
	});
	downloader.on('end', function() {
		console.log("done downloading");
	});
});


// Called by SNS when S3 and ElasticTranscoder events:
app.post('/update', function(request, response){
	console.log('Recieved update SNS');
	console.log(request.body);
	console.log(request.body.message);
	console.log(request.text); //.text has been added by raw-body middleware.
	response.send(request.text);
});


app.get('/feed', function(req, res) {
	res.send('<p>Choose format: <ul><li><a href="./rss">RSS</a></li><li><a href="./atom">Atom</a></li></ul></p>');
});

// Rendering a RSS 2.0 valid feed
app.get('/feed/rss', function(req, res) {
	res.set('Content-Type', 'application/rss+xml');
	res.send(require('./getFeed.js').getFeed().render('rss-2.0'));
});

// Rendering an Atom 1.0 valid feed
app.get('/feed/atom', function(req, res) {
	res.set('Content-Type', 'application/atom+xml');
	res.send(require('./getFeed.js').getFeed().render('atom-1.0'));
});

app.listen(config.PORT);
console.log('Running on http://localhost:' + config.PORT);
