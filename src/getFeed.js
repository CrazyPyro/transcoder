
module.exports = {
  listBucket: function (bucketName, cb) {
        var AWS = require('aws-sdk');
	var s3 = new AWS.S3({params: {Bucket: bucketName}});
        s3.listObjects().on('complete', function(response) {
                cb(response);
        }).send();
  }, //end listBucket

  getFeedData: function(res, feedType) {
	var config = require('./config.js');
	module.exports.listBucket(config.outputBucket, function(response) {
                console.log(response.data);
                console.log(response.error);
	var posts = [];
	var contents = response.data.Contents;
	for(var i = 0; i < contents.length; i++) {
		var item = contents[i];
		console.log('Adding ');
                console.dir(item);
                posts.push({
                    title:          item.Key,
                    url:           'https://s3.amazonaws.com/'+config.outputBucket+'/'+item.Key,
                    description:    item.Key,
                    date:           new Date(item.LastModified),
                    content:    item.Key, // Empty content causes feed validation problems.
                });
	}
        module.exports.getFeed(res, feedType, posts);
	}); //end S3 callback
  }, // end getFeedData

  getFeed: function (res, feedType, posts) {
    var config = require('./config.js');
    var Feed = require('feed');
    var feed = new Feed({
        title:          'MOOC transcoder',
        description:    'Made by MOOC Transcoder',
        link:           config.publicUrl + '/feed/',
        //image:          'http://example.com/logo.png',
        copyright:      'Copyright by original content creators. This is a re-broadcast.',
        author: {
            name:       'Neil Funk',
            email:      'transcoder@neilfunk.com',
            link:       config.publicUrl
        },
	docs: config.publicUrl, // Force override; this was defaulting to http://blogs.law.harvard.edu/tech/rss
	//updated:     new Date(),
    });

            for(var key in posts) {
		console.log('Adding ' + key.toString());
		console.dir(posts[key]);
                feed.addItem({
                    title:          posts[key].title,
                    link:           posts[key].url,
                    description:    posts[key].description,
                    date:           posts[key].date,
		    content:	posts[key].description, // Empty content causes feed validation problems.
                });
            }
    console.log('Done. Returning:');
    console.dir(feed);
    res.send(feed.render(feedType));
  }, //end getFeed

  renderFeed: function(res, feedType) {
        module.exports.getFeedData(res, feedType);
  },
};
