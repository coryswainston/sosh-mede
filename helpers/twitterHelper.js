const Twit = require('twit');

module.exports = {
  makePost: makePost,
  search: search,
  getTimeline: getTimeline
}

/**
 * Posts a tweet
 */
function makePost(postText, callback) {
  var T = connect();

  T.post('statuses/update', { status: postText }, (err, data, response) => {
    var id = data.id_str;
    var url = 'https://twitter.com/cs313test/status/' + id;

    callback(err == null, url);
  });
}

/**
 * Search Twitter for a String
 */
function search(term, callback) {
  var T = connect();

  T.get('search/tweets', {count: 10, tweet_mode: 'extended', q: term, lang: 'en'}, (err, data, response) => {
    var posts = new Array();

    if (err) {
      callback(err, posts);
    }

    data = data.statuses;
    for (var i = 0; i < data.length; i++) {
      var post = assembleTweet(i, data[i]);
      posts.push(post);
    }

    callback(err, posts);
  });
}

/**
 * Get the first 100 posts on a user's timeline
 */
function getTimeline(callback) {
  var T = connect();

  T.get('statuses/home_timeline', {count: 100, tweet_mode: 'extended'}, (err, data, response) => {
    var posts = new Array();
    if (err) {
      callback(err, posts);
    }

    for (var i = 0; i < data.length; i++) {
      var post = assembleTweet(i, data[i]);
      posts.push(post);
    }
    callback(null, posts);
  });
}

function connect() {
  return new Twit({
      consumer_key:         process.env.CONSUMER_KEY,
      consumer_secret:      process.env.CONSUMER_SECRET,
      access_token:         process.env.ACCESS_TOKEN,
      access_token_secret:  process.env.ACCESS_TOKEN_SECRET
    });
}

function assembleTweet(id, tweet) {

  var post = {
    id: id,
    text: checkForLink(tweet.full_text),
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

function checkForLink(text) {
  var words = text.split(' ');
  var lastWord = words[words.length - 1];
  if (lastWord.startsWith('http')) {
    words[words.length - 1] = '<a class="post-link" href="' + lastWord + '">'
      + lastWord + '</a>';
    text = words.join(' ');
  }

  return text;
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
