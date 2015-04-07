
console.log('Starting up...');

var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');
var jade = require('jade');
var zlib = require('zlib');
var AWS = require('aws-sdk'); // Credentials in ENV vars

var s3 = new AWS.S3();
AWS.config.region = 'us-east-1';
console.log('AWS.config: '+AWS.config);
var PORT = 8080;
var inputBucket = 'in.et.neilfunk.com';
var outputBucket = 'out.et.neilfunk.com';
console.log('Configuration complete.');

// App
var app = express();

//app.use(app.staticProvider(__dirname + '/'));
//app.engine('.html', jade);
app.engine('.html', require('ejs').renderFile);

//app.use(bodyParser.urlencoded());
//app.use(bodyParser.json());

app.get('/', function (req, res) {
	console.log('Serving homepage.');
	res.render('index.html');
	//res.send('<p>MOOC Transcoder</p><p>Try something like <a href="/list">list</a> or <a href="/listall">list all</a> or <form action="/download" method="get"><input type="text" name="filename" value="test.mp4" /><input type="submit" value="Download"/></form> or <form action="/upload" method="get"><input type="text" name="filename" value="test.mp4" /><input type="submit" value="Upload"/></form> or <form action="/update" method="post"><input type="hidden" name="test" value="test" /><input type="submit" value="SNS test"/></form></p>\n');

});

app.get('/list', function (req, res) {
	s3.listBuckets().on('complete', function(response) {
		console.log(response.data);
		console.log(response.error);
	}).send();
	s3.getObject({Bucket: 'bucket', Key: 'key'}).on('success', function(response) {
		console.log("Key was", response.request.params.Key);
	}).send();

	/*
	s3.listBuckets(function(error, data) {
		if (error) {
			console.log(error); // error is Response.error
		} else {
			console.log(data); // data is Response.data
		}
	});
	*/
});

app.get('/ec2', function (req, res) {
console.log('EC2:');
var request = new AWS.EC2().describeInstances();
// register a callback to report on the data
request.on('success', function(resp) {
  console.log(resp.data); // log the successful data response
});
// send the request
request.send();
});

app.get('/listall', function (req, res) {
	var allKeys = [];
	var s3 = new AWS.S3({params: {Bucket: inputBucket}});
	s3.listObjects().on('complete', function(response) {
		console.log(response.data);
		console.log(response.error);
	}).send();
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
	var body = fs.createReadStream(filepath);//.pipe(zlib.createGzip());
	var s3 = new AWS.S3({computeChecksums: false, params: {Bucket: inputBucket, Key: filename}});
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

});

app.get('/download', function (req, res) {
        var filename = req.query.filename;
        var filepath = '/mnt/' + filename;
        console.log('Trying to download to local file "'+filepath+'" from  S3 key "'+filename+'"');
	var s3 = new AWS.S3({params: {Bucket: outputBucket, Key: filename}});
	//{computeChecksums: false});
	var file = fs.createWriteStream(filepath);
	//var params = {Bucket: outputBucket, Key: filename};
	s3.getObject(/*params*/).createReadStream().pipe(file);
	console.log('Download complete: "'+filepath+'"');
});


// Called by SNS when S3 and ElasticTranscoder events:
app.post('/update', function(request, response){
	console.log('Recieved update SNS');
	console.log(request.body);
	console.log(request.body.message);
});


app.listen(PORT);
console.log('Running on http://localhost:' + PORT);
