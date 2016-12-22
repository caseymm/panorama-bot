/* Configure the Twitter API */
var TWITTER_CONSUMER_KEY = 'Cf4kNj9m8cEafzl8DUGDPo5Wi';
var TWITTER_CONSUMER_SECRET = 'l5fC4FAYljF3oOqcx0ICeHV8UuPoDjsBSYwZHxEFDkr9yXfjQS';
var TWITTER_ACCESS_TOKEN = '803630702864388096-EiFKbKklVr26hPIxqOlzXGjci8aynTy';
var TWITTER_ACCESS_TOKEN_SECRET = 'mvJeLCWhzo2ChBvL6l7FvZ0E2rNx3RekW6EvwEtZurhUy';

var Twit = require('twit'),
		fs = require('fs'),
		request = require('request'),
		gm = require('gm'),
		_ = require('underscore');

var Bot = new Twit({
	consumer_key: TWITTER_CONSUMER_KEY,
	consumer_secret: TWITTER_CONSUMER_SECRET,
	access_token: TWITTER_ACCESS_TOKEN,
	access_token_secret: TWITTER_ACCESS_TOKEN_SECRET
});

console.log('The bot is running...');

var getImages = function(tweet){
	var download = function(uri, filename, callback){
	  request.head(uri, function(err, res, body){
	    // console.log('content-type:', res.headers['content-type']);
	    // console.log('content-length:', res.headers['content-length']);
	    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
	  });
	};

	fs.mkdir('images/'+tweet.id_str);

	var finished = [];
	for(var x=0; x < 360; x+= 30){
		// console.log(tweet.id_str, x);
		download('https://maps.googleapis.com/maps/api/streetview?size=280x640&location='+tweet.geo.coordinates[0]+','+tweet.geo.coordinates[1]+'&fov=30&heading='+x+'&pitch=0&key=AIzaSyAtSGmdpF9-vYFhfnSpxrBupcmy7dlfCyc', 'images/'+tweet.id_str+'/img-'+x+'.jpg', function(){
			finished.push('img-'+x+'.jpg');
			if(finished.length === 12){
				mergeImages(tweet);
			}
		});
  }
};

var mergeImages = function(tweet){
	var path = 'images/'+tweet.id_str+'/';
	gm(path+'img-0.jpg')
		.append(path+'img-30.jpg', path+'img-60.jpg', path+'img-90.jpg', path+'img-120.jpg', path+'img-150.jpg', path+'img-180.jpg', path+'img-210.jpg', path+'img-240.jpg', path+'img-270.jpg', path+'img-300.jpg', path+'img-330.jpg', true)
		.minify()  // Halves the size
		.write(path+'output.jpg', function (err) {
				if (err) console.log(err);
				twitter_image(tweet.place.full_name, path+'output.jpg', tweet);
		});
}

var twitter_image = function(message, file_name, tweet) {

	fs.readFile(file_name, {encoding: 'base64'}, function(err, imageB64) {

		Bot.post('media/upload', { media_data: imageB64 }, function (err, data, response) {
		  var mediaIdStr = data.media_id_string;
		  var params = { status: '@'+tweet.user.screen_name +' '+ message, in_reply_to_status_id: tweet.id_str, media_ids: [mediaIdStr] };
		  Bot.post('statuses/update', params, function (err, data, response) {
		    // console.log(data);
				rmDir('images/'+tweet.id_str);
		  })
		});

	});

};

var rmDir = function(dirPath) {
      try { var files = fs.readdirSync(dirPath); }
      catch(e) { return; }
      if (files.length > 0)
        for (var i = 0; i < files.length; i++) {
          var filePath = dirPath + '/' + files[i];
          if (fs.statSync(filePath).isFile())
            fs.unlinkSync(filePath);
          else
            rmDir(filePath);
        }
      fs.rmdirSync(dirPath);
    };

/* BotInit() : To initiate the bot */
function BotInit() {
	// Bot.post('statuses/retweet/:id', { id: '669520341815836672' }, BotInitiated);

	function BotInitiated (error, data, response) {
		if (error) {
			console.log('Bot could not be initiated, : ' + error);
		}
		else {
  			console.log('Bot initiated!');
		}
	}

	BotMentions();
	setInterval(BotMentions, 60*1000);
}

/* BotRetweet() : To retweet the matching recent tweet */
function BotMentions() {
	var seconds = new Date().getTime() / 1000;

	var mentions = Bot.get('statuses/mentions_timeline', BotGotLatestTweet),
			replies = Bot.get('statuses/user_timeline', BotGotReplies),
			newMentions = [],
			newReplies = [];

	function BotGotReplies (error, data, response){
		newReplies = _.filter(data, function(tweet){
			var tweetTime = new Date(tweet.created_at).getTime() / 1000;
			return tweetTime > seconds - 60;
		});
		newReplies = _.pluck(newReplies, 'in_reply_to_status_id_str');
	}

	function BotGotLatestTweet (error, data, response) {
		if (error) {
			console.log('Bot could not find latest tweet, : ' + error);
		}
		else {
			newMentions = _.filter(data, function(tweet){
				if(!tweet.geo && tweet.place){
					var placeCoords = tweet.place.bounding_box.coordinates[0][0];
					tweet.geo = { 'coordinates': [placeCoords[1], placeCoords[0]] };
				}
				var tweetTime = new Date(tweet.created_at).getTime() / 1000;
				return tweetTime > seconds - 60 && tweet.geo;
			});
			for(var n = 0; n < newMentions.length; n++){
				var tweet = data[n];
				if(_.indexOf(newReplies, tweet.id_str) < 0){
					getImages(tweet);
				}
			}
		}
	}

}

/* Initiate the Bot */
BotInit();
