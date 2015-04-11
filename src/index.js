
console.log('Starting up...');

var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');
var jade = require('jade');
var zlib = require('zlib');
var AWS = require('aws-sdk'); // Credentials in ENV vars

var s3 = new AWS.S3();
AWS.config.region = 'us-east-1';
//AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: process.env.AWS_PROFILE});


console.log('AWS.config:');
console.dir(AWS.config);
var config = require('./config.js');
console.dir(config);
//var PORT = config.PORT;
//var publicUrl = config.publicUrl;
//var inputBucket = config.inputBucket;
//var outputBucket = config.outputBucket;
console.log('Configuration complete.');

// App
var app = express();
app.engine('.html', require('ejs').renderFile);

//var access_logfile = fs.createWriteStream('/mnt/access.log', {flags: 'a'});
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
	}).send();
	s3.getObject({Bucket: 'bucket', Key: 'key'}).on('success', function(response) {
		console.log("Key was", response.request.params.Key);
	}).send();
});

app.get('/ec2', function (req, res) {
console.log('EC2:');
var request = new AWS.EC2().describeInstances();
request.on('success', function(resp) {
  console.log(resp.data); // log the successful data response
});
request.send();
});

app.get('/in', function (req, res) {
	var allKeys = [];
	var s3 = new AWS.S3({params: {Bucket: config.inputBucket}});
	s3.listObjects().on('complete', function(response) {
		console.log(response.data);
		console.log(response.error);
	}).send(); //response.data);
	//allKeys.push(data.Contents);

    //if(data.IsTruncated)
    //  listAllKeys(data.Contents.slice(-1)[0].Key, cb);
    //else
      //cb();

	//console.log(allKeys);
	//});
});



app.get('/upload', function (req, res) {
	var filename = req.query.filename;
	var filepath = '/mnt/' + filename;
	console.log('Trying to upload local file "'+filepath+'" to S3 as "'+filename+'"');

	var client = require('s3').createClient({s3Client: new AWS.S3()});
	var params = {
		localFile: filepath,
		s3Params: {
			Bucket: config.inputBucket,
			Key: filename,
			// other options supported by putObject, except Body and ContentLength. 
			// See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property 
		},
	};
	var uploader = client.uploadFile(params);
	uploader.on('error', function(err) {
		console.error("unable to upload:", err.stack);
	});
	uploader.on('progress', function() {
		console.log("progress", uploader.progressMd5Amount, uploader.progressAmount, uploader.progressTotal);
	});
	uploader.on('end', function() {
		console.log("done uploading");
		console.log(s3.getPublicUrl(config.inputBucket, filename));
	});
/*
	var s3 = new AWS.S3({computeChecksums: false, params: {Bucket: config.inputBucket, Key: filename}});
	s3.upload({Body: body}).on('httpUploadProgress', function(evt) {
		console.log(evt);
	}).send( function(err, data) {
		console.log("Got error:", err.message);
		console.log("Request:");
		console.log(this.httpRequest);
		console.log("Response:");
		console.log(this.httpResponse);
		//console.log(err, data)
	});
*/
});


app.get('/download', function (req, res) {
        var filename = req.query.filename;
        var filepath = '/mnt/' + filename;
        console.log('Trying to download to local file "'+filepath+'" from  S3 key "'+filename+'"');
/*
	var s3 = new AWS.S3({params: {Bucket: config.outputBucket, Key: filename}});
	//{computeChecksums: false});
	var file = fs.createWriteStream(filepath);
	s3.getObject().createReadStream().pipe(file);
	console.log('Download complete: "'+filepath+'"');
*/
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
