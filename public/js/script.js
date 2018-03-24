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
