window.onload = function() {
  var videos = document.getElementsByClassName('post-video');
  for (var i = 0; i < videos.length; i++) {
    var video = {
      element: videos[i],
      isPlaying: false
    }
    videos[i].addEventListener('click', function(event) {
      toggleVideoPlaying(video, event);
    });
  }

  var mainFeed = document.getElementById('main-feed');
  loadPosts(mainFeed);
  window.onscroll = function() {
    if ((window.innerHeight + window.pageYOffset) >= document.body.offsetHeight) {
      loadPosts(mainFeed);
    }
  };

  var searchForm = document.getElementById('search-form');
  searchForm.onsubmit = function(event) {
    event.preventDefault();
    var searchInput = document.getElementById('search-input');
    var term = searchInput.value;
    searchPosts(mainFeed, term);
  }

  var postForm = document.getElementById('post-form');
  postForm.onsubmit = function(event) {
    event.preventDefault();
    var postInput = document.getElementById('post-input');
    var postText = postInput.value;
    makePost(postForm, postText);
  }
}

function makePost(div, postText) {
  var request = new XMLHttpRequest();
  request.onload = function() {
    var response = JSON.parse(request.responseText);
    if (response.success == true) {
      var successLink = '<a href="' + response.postUrl + '">Successfully posted!</a>';
      div.innerHTML += successLink;
    } else {
      // do nothing yet
    }
  }
  request.open('POST', '/post', true);
  request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  request.send('postText=' + postText);
}

function loadPosts(div) {
  var request = new XMLHttpRequest();
  request.onload = function() {
    if (request.status === 200) {
      div.innerHTML += request.responseText;
    }
  };
  request.open('GET', '/posts');
  request.send();
}

function searchPosts(div, term) {
  var request = new XMLHttpRequest();
  request.onload = function() {
    if (request.status === 200) {
      div.innerHTML = request.responseText;
    }
  };
  request.open('GET', '/search?term=' + term);
  request.send();
}

function toggleVideoPlaying(video, event) {
    event.preventDefault();
    if (video.isPlaying) {
      video.element.pause();
      video.isPlaying = false;
    } else {
      video.element.play();
      video.isPlaying = true;
    }
}
