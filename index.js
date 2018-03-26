const express = require('express');
const app = express();
const Twit = require('twit');

app.set('port', (process.env.PORT || 8000))
  .use(express.static(__dirname + '/public'))
  .use(express.urlencoded({extended:true}))
  .use(express.json())
  .set('views', __dirname + '/views')
  .set('view engine', 'ejs')
  .get('/', getFeed)
  .get('/search', searchPosts)
  .get('/posts', renderPosts)
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

    res.json({success: err == null, postUrl: url});
  });
}

function getFeed(req, res) {
    res.render('pages/feed', {term: null});
}

function searchPosts(req, res) {
  var T = new Twit({
    consumer_key:         process.env.CONSUMER_KEY,
    consumer_secret:      process.env.CONSUMER_SECRET,
    access_token:         process.env.ACCESS_TOKEN,
    access_token_secret:  process.env.ACCESS_TOKEN_SECRET
  });

  var searchQuery = req.query.term; // req.params.term;

  T.get('search/tweets', {count: 10, tweet_mode: 'extended', q: searchQuery, lang: 'en'}, (err, data, response) => {
    var posts = new Array();
    data = data.statuses;
    for (var i = 0; i < data.length; i++) {
      var post = assembleTweet(i, data[i]);
      posts.push(post);
    }

    res.render('post/posts', {term: searchQuery, posts: posts});
  });
}

function getTweets(callback) {
  var T = new Twit({
    consumer_key:         process.env.CONSUMER_KEY,
    consumer_secret:      process.env.CONSUMER_SECRET,
    access_token:         process.env.ACCESS_TOKEN,
    access_token_secret:  process.env.ACCESS_TOKEN_SECRET
  });

  T.get('statuses/home_timeline', {count: 100, tweet_mode: 'extended'}, (err, data, response) => {
    var posts = new Array();
    for (var i = 0; i < data.length; i++) {
      var post = assembleTweet(i, data[i]);
      posts.push(post);
    }
    console.log(posts);
    savePosts(posts, callback);
  });
}

function savePosts(posts, callback) {
  getMongoClient((err, cli) => {
    if (err) {
      return console.error(err);
    }
    var db = cli.db('sosh-mede');

    db.collection('posts').drop((err, res) => {
      db.collection('posts').insert(posts, (err, res) => {
        db.collection('meta').updateOne({}, {$set: {postIdx: 0, lastCall: new Date()}}, true, (err, res) => {
          cli.close();
          callback();
        });
      });
    });
  });
}

function retrievePosts(idx, callback) {
  getMongoClient((err, cli) => {
    if (err) {
      console.error(err);
    }
    var db = cli.db('sosh-mede');
    var posts = new Array();
    db.collection('posts').find({'id': {$gte:idx}}).limit(10).toArray((err, posts) => {
      if (err) {
        console.error(err);
      }

      cli.close();

      callback(posts);
    });
  });
}

function renderPosts(req, res) {
  getMongoClient((err, cli) => {
    var db = cli.db('sosh-mede');
    db.collection('meta').findOne({}, (err, result) => {
      if (err) {
        console.error(err);
      }
      if (result == null) {
        console.log('result was null');
        result = {lastCall: new Date(), postIdx: 0};
      }
      if(new Date().getTime() - Date.parse(result.lastCall) > 120000) { // 2 minutes in millis
        console.log('Making an API call');
        getTweets(() => {
          retrievePosts(0, (posts) => {
            res.render('post/posts', {term: null, posts: posts});
          })
        });
      } else {
        console.log('Avoiding an API call');
        var postIdx = result.postIdx + 10;
        db.collection('meta').updateOne({}, {$set: {postIdx: postIdx, lastCall: result.lastCall}}, {upsert: true}, (err, upd) => {
          if (err) {
            console.error(err);
          }
          retrievePosts(postIdx, (posts) => {
            res.render('post/posts', {term: null, posts: posts});
          });
        });
      }
    });
  });
}

function assembleTweet(id, tweet) {

  var text = tweet.full_text;
  var idx = text.search('http');
  if (idx != -1) {
    text = [text.slice(0, idx), '<a class="post-link" href="', text.slice(idx), '">', text.slice(idx), '</a>'].join('');
  }

  var post = {
    id: id,
    text: text,
    userName: tweet.user.name,
    userHandle: tweet.user.screen_name,
    userPic: tweet.user.profile_image_url.replace('_normal', '_400x400'),
    date: formatTime(tweet.created_at),
    url: 'https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str,
    icon: 'images/twitter-icon.png',
    sharedPost: tweet.quoted_status ? assembleTweet(null, tweet.quoted_status) : null,
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

function getMongoClient(callback) {
  var MongoClient = require('mongodb').MongoClient;

  var uri = 'mongodb+srv://swainstoncory89:' + process.env.MONGO_PASS + '@sosh-mede-u9ng4.mongodb.net/sosh-mede';
  MongoClient.connect(uri, callback);
}
