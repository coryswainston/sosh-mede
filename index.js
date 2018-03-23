const express = require('express');
const app = express();
const Twit = require('twit');

app.set('port', (process.env.PORT || 8000))
  .use(express.static(__dirname + '/public'))
  .use(express.urlencoded({extended:true}))
  .use(express.json())
  .set('views', __dirname + '/views')
  .set('view engine', 'ejs')
  .get('/', getPosts)
  .get('/search', searchPosts)
  .post('/post', makePost)
  .listen(app.get('port'), () => console.log('Listening on ' + app.get('port')));

function makePost(req, res) {
  var T = new Twit({
    consumer_key:         process.env.CONSUMER_KEY,
    consumer_secret:      process.env.CONSUMER_SECRET,
    access_token:         process.env.ACCESS_TOKEN,
    access_token_secret:  process.env.ACCESS_TOKEN_SECRET
  });

  T.post('statuses/update', { status: req.body.postText }, (err, data, response) => {
    var id = data.id_str;
    var url = 'https://twitter.com/cs313test/status/' + id;

    // res.json({postUrl: url});
    res.redirect(302, '/');
  });
}

function getPosts(req, res) {
  var T = new Twit({
    consumer_key:         process.env.CONSUMER_KEY,
    consumer_secret:      process.env.CONSUMER_SECRET,
    access_token:         process.env.ACCESS_TOKEN,
    access_token_secret:  process.env.ACCESS_TOKEN_SECRET
  });

  T.get('statuses/home_timeline', {count: 30, tweet_mode: 'extended'}, (err, data, response) => {
    var posts = new Array();
    data.forEach((tweet) => {
      var post = assembleTweet(tweet);
      posts.push(post);
    });

    // res.json(posts);
    res.render('pages/feed', {posts: posts});
  });
}

function searchPosts(req, res) {
  var T = new Twit({
    consumer_key:         process.env.CONSUMER_KEY,
    consumer_secret:      process.env.CONSUMER_SECRET,
    access_token:         process.env.ACCESS_TOKEN,
    access_token_secret:  process.env.ACCESS_TOKEN_SECRET
  });

  var searchQuery = req.query.term; // req.params.term;

  T.get('search/tweets', {count: 30, tweet_mode: 'extended', q: searchQuery, lang: 'en'}, (err, data, response) => {
    var posts = new Array();
    data = data.statuses;
    data.forEach((tweet) => {
      var post = assembleTweet(tweet);
      posts.push(post);
    });

    // res.json(posts);
    res.render('pages/feed', {posts: posts});
  });
}

function assembleTweet(tweet) {

  var post = {
    text: tweet.full_text,
    userName: tweet.user.name,
    userHandle: tweet.user.screen_name,
    userPic: tweet.user.profile_image_url.replace('_normal', '_400x400'),
    date: formatTime(tweet.created_at),
    url: 'https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str,
    icon: 'images/twitter-icon.png',
    sharedPost: tweet.quoted_status ? assembleTweet(tweet.quoted_status) : null,
    photo: getPhoto(tweet),
    video: getVideo(tweet)
  }

  return post;
}

function getPhoto(tweet) {
  if (tweet.entities.media) {
    var firstMedia = tweet.entities.media[0];
    if (firstMedia.type == 'photo') {
      return firstMedia.media_url;
    }
  }
  return null;
}

function getVideo(tweet) {
  if (!tweet.extended_entities) {
    return null;
  }
  if (tweet.extended_entities.media) {
    var firstMedia = tweet.extended_entities.media[0];
    if (firstMedia.type == 'video' || firstMedia.type == 'animated_gif') {
      return firstMedia.video_info.variants;
    }
  }
  return null;
}

function formatTime(timestamp) {
  var date = new Date(Date.parse(timestamp));
  var now = new Date(Date.now());

  if (now.getFullYear() - date.getFullYear() > 0) {
    return getDifference(now.getFullYear(), date.getFullYear(), 'year');
  }
  if (now.getMonth() - date.getMonth() > 0) {
    return getDifference(now.getMonth(), date.getMonth(), 'month');
  }
  if (now.getDay() - date.getDay() > 0) {
    return getDifference(now.getDay(), date.getDay(), 'day');
  }
  if (now.getHours() - date.getHours() > 0) {
    return getDifference(now.getHours(), date.getHours(), 'hour');
  }
  if (now.getMinutes() - date.getMinutes() > 0) {
    return getDifference(now.getMinutes(), date.getMinutes(), 'minute');
  }
  return 'Just now';
}

function getDifference(now, then, unit) {
  var diff = now - then;
  if (diff > 1) {
    unit += 's';
  }
  return diff + ' ' + unit + ' ago';
}
