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
