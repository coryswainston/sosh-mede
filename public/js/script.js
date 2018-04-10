var idx = 0;

window.onload = function() {
  var mainFeed = document.getElementById('main-feed');
  loadPosts(mainFeed);

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
    var platformChecks = document.getElementsByClassName('platform-check');
    var platforms = new Array();
    for (var i = 0; i < platformChecks.length; i++) {
      if (platformChecks[i].checked) {
        platforms.push(platformChecks[i].value);
      }
    }
    var postText = postInput.value;
    if (platforms.length > 0) {
      makePost(postForm, postText, platforms);
    }
  }
}

function makePost(div, postText, platforms) {
  var request = new XMLHttpRequest();
  request.onload = function() {
    var response = JSON.parse(request.responseText);
    var success = true;
    for (var i = 0; i < response.length; i++) {
      if (response[i].success == true) {
        var successLink = '<br/><a href="' + response[i].postUrl + '">Successfully posted on ' + response[i].platform + '!</a>';
        div.innerHTML += successLink;
      } else {
        div.innerHTML += '<p>There was an error posting your status on ' + response[i].platform + '.</p>';
      }
    }
  }
  request.open('POST', '/post', true);
  request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  request.send('postText=' + postText + '&platforms=' + JSON.stringify(platforms));
}

function loadPosts(div) {
  var loadingGif = document.getElementById('post-load');
  loadingGif.style.display = 'block';
  var request = new XMLHttpRequest();
  request.onreadystatechange = function() {
    if (request.status === 200) {
      loadingGif.style.display = 'none';
      div.innerHTML = request.responseText;
    }
  };
  request.onerror = function() {
    loadingGif.style.display = 'none';
    var errorMessage = '<p id="error-loading">Couldn\'t load posts.</p>';
    if (document.getElementById('error-loading') == null) {
      div.innerHTML += errorMessage;
    }
    window.onscroll = null;
  };
  request.open('GET', '/posts?idx=' + idx, false);
  request.send();
  idx += 10;
}

function searchPosts(div, term) {
  var request = new XMLHttpRequest();
  request.onreadystatechange = function() {
    if (request.status === 200) {
      div.innerHTML = request.responseText;
    }
  };
  request.onerror = function() {
    loadingGif.style.display = 'none';
    div.innerHTML += '<p>Couldn\'t load posts.</p>'
  };
  request.open('GET', '/search?term=' + term, true);
  request.send();
}

var videos = new Array();

function toggleVideoPlaying(video) {
  console.log('called');
  console.log(video);
  if (video.paused) {
    video.play();
  } else {
    video.pause();
  }
}
