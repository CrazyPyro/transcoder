
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

app.get('/list', function (req, res) {
	s3.listBuckets().on('complete', function(response) {
		console.log(response.data);
		console.log(response.error);
		res.send(response.data);
	}).send();
});

app.get('/ec2', function (req, res) {
	console.log('EC2:');
	var request = new AWS.EC2().describeInstances();
	request.on('success', function(resp) {
		console.log(resp.data);
		res.send(resp.data);
	});
	request.send();
});

app.get('/in', function (req, res) {
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
