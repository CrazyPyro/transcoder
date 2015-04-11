// Based on example from http://howtonode.org/content-syndication-with-node
module.exports = {
  getFeed: function () {
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
	//updated:     new Date(),
    });

	// Hardcoded, just for testing:
        var posts = {
                key1: {title: "title1", url: config.publicUrl+"/url1", description: "desc1", date: new Date("04/01/2015")},
                key2: {title: "title2", url: config.publicUrl+"/url2", description: "desc2", date: new Date("04/02/2015")},
                key3: {title: "title3", url: config.publicUrl+"/url3", description: "desc3", date: new Date("04/03/2015")},
                key4: {title: "title4", url: config.publicUrl+"/url4", description: "desc4", date: new Date("04/04/2015")},
                key5: {title: "title5", url: config.publicUrl+"/url5", description: "desc5", date: new Date("04/05/2015")}
        };
            for(var key in posts) {
		console.log('Adding ' + key.toString());
		console.dir(posts[key]);
                feed.addItem({
                    title:          posts[key].title,
                    link:           posts[key].url,
                    description:    posts[key].description,
                    date:           posts[key].date
                });
            }
    console.log('Done. Returning:');
    console.dir(feed);
    return feed;
  }, //end getFeed
};
