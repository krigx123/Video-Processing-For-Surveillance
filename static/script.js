let startTimestamp = null;
let timerInterval = null;

function startRecording() {
  fetch('/start_recording', {method: 'POST'})
      .then(res => res.json())
      .then(data => {
        startTimestamp = data.start_time * 1000;  // Convert to ms
        updateProgress();  // Start stopwatch and progress
      });
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

function stopRecording() {
  fetch('/stop_recording', {method: 'POST'})
      .then(res => res.json())
      .then(data => {
        clearInterval(timerInterval);
        startTimestamp = null;
        document.getElementById('timerText').innerText = 'Recording stopped';
        checkDownloadAvailability();
      });
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
