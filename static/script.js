let startTimestamp = null;
let timerInterval = null;
let isRecording = false;

function toggleRecording() {
  const button = document.getElementById('recordToggleBtn');
  button.className = isRecording ? 'recording' : 'idle';

  if (!isRecording) {
    // Start recording
    fetch('/start_recording', {method: 'POST'})
        .then(res => res.json())
        .then(data => {
          isRecording = true;
          startTimestamp = data.start_time * 1000;
          button.innerText = 'Stop Recording';
          updateProgress();
        });
  } else {
    // Stop recording
    fetch('/stop_recording', {method: 'POST'})
        .then(res => res.json())
        .then(data => {
          isRecording = false;
          startTimestamp = null;
          clearInterval(timerInterval);
          document.getElementById('timerText').innerText = 'Recording stopped';
          button.innerText = 'Start Recording';
          checkDownloadAvailability();
        });
  }
}


function updateProgress() {
  clearInterval(timerInterval);

  const progressBar = document.getElementById('progressBar');
  const timerText = document.getElementById('timerText');

  timerInterval = setInterval(() => {
    if (!startTimestamp) return;

    const now = new Date().getTime();
    const elapsedSeconds = Math.floor((now - startTimestamp) / 1000);

    progressBar.value = elapsedSeconds;
    timerText.innerText = `Recording: ${formatTime(elapsedSeconds)}`;

    // Optional: stop at 60 seconds (or keep running forever)
    if (elapsedSeconds >= 60) {
      clearInterval(timerInterval);
    }
  }, 1000);
}

function downloadRecording() {
  window.location.href = '/download';
}

function checkDownloadAvailability() {
  fetch('/status').then(res => res.json()).then(data => {
    if (data.file_available) {
      document.getElementById('downloadBtn').style.display = 'inline-block';
    } else {
      document.getElementById('downloadBtn').style.display = 'none';
    }
  });
}

function formatTime(seconds) {
  const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}


// Poll every 5s to update UI
setInterval(checkDownloadAvailability, 5000);

window.onload = () => {
  checkDownloadAvailability();
};
