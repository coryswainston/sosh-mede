const express = require('express');
const app = express();
const session = require('express-session');
const TwitterHelper = require('./helpers/twitterHelper.js')

app.set('port', (process.env.PORT || 8000))
  .use(express.static(__dirname + '/public'))
  .use(express.urlencoded({extended:true}))
  .use(express.json())
  .use(session({
    secret: 'fix this later',
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 604800000 // a week
    }
  }))
  .set('views', __dirname + '/views')
  .set('view engine', 'ejs')
  .get('/twitter/auth/callback', twitterCallback)
  .get('/twitter/auth', twitterAuthenticate)
  .get('/login', login)
  .get('/', getFeed)
  .get('/search', searchPosts)
  .get('/posts', renderPosts)
  .post('/post', makePost)
  .listen(app.get('port'), () => console.log('Listening on ' + app.get('port')));

function login(req, res) {
  res.render('pages/login');
}

function twitterCallback(req, res) {
  TwitterHelper.getTwitterAccessToken(
    req.session.twitterRequest.token,
    req.session.twitterRequest.secret,
    req.query.oauth_verifier,
    (err, accessToken, accessTokenSecret, results) => {
      if (err) {
        console.error(err);
      } else {
        req.session.twitterCred = {
          accessToken: accessToken,
          accessTokenSecret: accessTokenSecret
        };
        res.redirect('/');
      }
    });
}

function twitterAuthenticate(req, res) {
  var token = TwitterHelper.getTwitterToken((err, obj) => {
    if (err) {
      console.error(err);
      res.end();
    } else {
      req.session.twitterRequest = obj;
      res.redirect('https://twitter.com/oauth/authenticate?oauth_token=' + obj.token);
    }
  });
}

function getFeed(req, res) {
  if (!req.session.twitterCred) {
    res.redirect('/login');
  } else {
    res.render('pages/feed', {term: null});
  }
}

function makePost(req, res) {
  TwitterHelper.makePost(req.session.twitterCred, req.body.postText, (success, url) => {
    res.json({success: success, postUrl: url});
  });
}

function searchPosts(req, res) {
  TwitterHelper.search(req.session.twitterCred, req.query.term, (err, posts) => {
    if (err) {
      console.error(err);
    }
    res.render('post/posts', {term: req.query.term, posts: posts});
  });
}

function getPosts(cred, callback) {
  TwitterHelper.getTimeline(cred, (err, posts) => {
    if (err) {
      console.error(err);
    }
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
        if (err) {
          console.error(err);
        }
        cli.close();
        callback();
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
  var idx = req.query.idx;

  if (idx == 0) {
    console.log('Making an API call');
    getPosts(req.session.twitterCred, () => {
      retrievePosts(0, (posts) => {
        res.render('post/posts', {term: null, posts: posts});
      });
    });
  } else {
    console.log('Avoiding an API call');
    retrievePosts(idx, (posts) => {
      res.render('post/posts', {term: null, posts: posts});
    });
  }
}

function getMongoClient(callback) {
  var MongoClient = require('mongodb').MongoClient;

  var uri = 'mongodb+srv://swainstoncory89:' + process.env.MONGO_PASS + '@sosh-mede-u9ng4.mongodb.net/sosh-mede';
  MongoClient.connect(uri, callback);
}
