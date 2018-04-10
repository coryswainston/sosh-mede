const express = require('express');
const app = express();
const session = require('express-session');
const TwitterHelper = require('./helpers/twitterHelper.js')
const passport = require('passport');
const Strategy = require('passport-facebook').Strategy;
const FB = require('fb');

passport.use(new Strategy({
  clientID: process.env.FB_APP_ID,
  clientSecret: process.env.FB_APP_SECRET,
  callbackURL: process.env.FB_CALLBACK
}, (accessToken, refreshToken, profile, cb) => {

  console.log(profile);

  return cb(null, {
    token: accessToken,
    profile: profile
  });
}));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});


app.set('port', (process.env.PORT || 8000))
  .use(express.static(__dirname + '/public'))
  .use(express.urlencoded({extended:true}))
  .use(express.json())
  .use(session({
    secret: 'fix this later',
    resave: false,
    saveUninitialized: true,
  }))
  .use(passport.initialize())
  .use(passport.session())
  .set('views', __dirname + '/views')
  .set('view engine', 'ejs')
  .get('/twitter/auth/callback', twitterCallback)
  .get('/twitter/auth', twitterAuthenticate)
  .get('/login', login)
  .get('/', getFeed)
  .get('/search', searchPosts)
  .get('/posts', renderPosts)
  .get('/fb/auth', passport.authenticate('facebook', {scope: ['publish_actions', 'user_posts', 'user_photos']}))
  .get('/fb/auth/callback', passport.authenticate('facebook', {failureRedirect: '/login'}), (req, res) => {
    req.session.fbCred = req.user;
    res.redirect('/');
  })
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
  if (!req.session.twitterCred && !req.session.fbCred) {
    res.redirect('/login');
  } else {
    res.render('pages/feed', {term: null});
  }
}

function makePost(req, res) {
  var results = new Array();
  var platforms = JSON.parse(req.body.platforms);

  var postText = req.body.postText;

  function postToTwitter(callback) {
    if (platforms.indexOf('twitter') != -1) {
      TwitterHelper.makePost(req.session.twitterCred, postText, (success, url) => {
        results.push({platform: 'twitter', success: success, postUrl: url});
        callback();
      });
    } else {
      callback();
    }
  }
  function postToFacebook(callback) {
    if (platforms.indexOf('facebook') != -1) {
      var fb = FB.extend({appId: process.env.FB_APP_ID, appSecret: process.env.FB_APP_SECRET});
      fb.setAccessToken(req.session.fbCred.token);
      fb.api('me/feed', 'post', {message: postText}, fbRes => {
        if (fbRes.error) {
          console.error(fbRes.error);
          return;
        }
        results.push({platform: 'facebook', success: fbRes.error == null, postUrl: null});
        callback();
      });
    } else {
      callback();
    }
  }
  function postToInstagram(callback) {
    if (platforms.indexOf('instagram') != -1) {
      results.push({platform: 'instagram', success: false, postUrl: null});
    }
    callback();
  }

  postToTwitter(() => {
    postToFacebook(() => {
      postToInstagram(() => {
        res.json(results);
      });
    });
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

function getTweets(cred, callback) {
  TwitterHelper.getTimeline(cred, (err, posts) => {
    if (err) {
      console.error(err);
    }
    callback(posts);
  });
}

function renderPosts(req, res) {
  var posts = new Array();
  if (req.session.twitterCred) {
    console.log('Making an API call');
    getTweets(req.session.twitterCred, (posts) => {
      res.render('post/posts', {term: null, posts: posts});
    });
  }
  if (req.session.fbCred) {
    var fb = FB.extend({appId: process.env.FB_APP_ID, appSecret: process.env.FB_APP_SECRET});
    fb.setAccessToken(req.session.fbCred.token);
    fb.api('me/feed', {fields: ['message', 'created_time', 'from{name,picture.type(normal)}', 'full_picture', 'story']}, fbRes => {
      if (fbRes.error) {
        console.error(fbRes.error);
        return;
      }
      var posts = new Array();
      var fbPosts = fbRes.data;
      for (var i = 0; i < fbPosts.length; i++) {
        posts.push({
          text: fbPosts[i].message,
          userName: fbPosts[i].from.name,
          userHandle: null,
          story: fbPosts[i].story,
          userPic: fbPosts[i].from.picture.data.url,
          date: fbPosts[i].created_time,
          url: 'https://www.facebook.com',
          icon: 'images/fb-icon.png',
          sharedPost: null,
          photo: fbPosts[i].full_picture ? fbPosts[i].full_picture : null,
          video: fbPosts[i].source ? fbPosts[i].source : null
        });
      }
      res.render('post/posts', {term: null, posts: posts});
    });
  }
}
