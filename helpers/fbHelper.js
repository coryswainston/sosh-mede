const FB = require('fb');
const timeUtil = require('./timeUtil.js')

module.exports = {
  makePost: makePost,
  getTimeline: getTimeline
}

function getTimeline(cred, callback) {
  var fields = ['message', 'created_time', 'from{name,picture.type(normal)}', 'full_picture', 'story'];
  var posts = new Array();
  getClient(cred).api('me/feed', {fields: fields, limit: 50}, res => {
    if (res.error) {
      return callback(res.error, posts);
    }
    var fbPosts = res.data;
    for (var i = 0; i < fbPosts.length; i++) {
      posts.push(assemblePost(fbPosts[i]));
    }

    callback(null, posts);
  });
}

function assemblePost(post) {
  if (!post.from) {
    console.log(post);
  }
  return {
    text: post.message,
    userName: post.from.name,
    userHandle: null,
    story: post.story,
    userPic: post.from.picture.data.url,
    relativeDate: timeUtil.formatTime(post.created_time),
    date: post.created_time,
    url: 'https://www.facebook.com/' + post.from.id + '/posts/' + post.id.split('_')[1],
    icon: 'images/fb-icon.png',
    sharedPost: null,
    photo: post.full_picture ? post.full_picture : null,
    video: post.source ? post.source : null
  }
}

function makePost(cred, postText, callback) {
  getClient(cred).api('me/feed', 'post', {message: postText}, res => {
    if (res.id) {
      var ids = res.id.split('_');
      var url = 'https://www.facebook.com/' + ids[0] + '/posts/' + ids[1];
    }
    callback(res.id != null, url);
  });
}

function getClient(cred) {
  var fb = FB.extend({appId: process.env.FB_APP_ID, appSecret: process.env.FB_APP_SECRET});
  fb.setAccessToken(cred.token);

  return fb;
}
