const audio = document.querySelector("#audio");
const playButton = document.querySelector("#playButton");
const muteButton = document.querySelector("#muteButton");
const timeline = document.querySelector("#timeline");
const currentTime = document.querySelector("#currentTime");
const durationLabel = document.querySelector("#duration");
const canvas = document.querySelector("#visualizer");
const context = canvas.getContext("2d");

let audioContext;
let analyser;
let source;
let animationFrame;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00.0";
  return `0:${seconds.toFixed(1).padStart(4, "0")}`;
}

function setupAudioGraph() {
  if (audioContext) return;
  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.82;
  source = audioContext.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioContext.destination);
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawIdle();
}

function drawIdle() {
  const { width, height } = canvas.getBoundingClientRect();
  context.clearRect(0, 0, width, height);
  const bars = 84;
  const gap = 4;
  const barWidth = Math.max(1, (width - gap * (bars - 1)) / bars);
  for (let i = 0; i < bars; i += 1) {
    const shape = Math.sin(i * 0.38) * Math.sin(i * 0.09);
    const barHeight = 8 + Math.abs(shape) * height * 0.32;
    context.fillStyle = i % 13 === 0 ? "#ff5c35" : "#34393b";
    context.fillRect(i * (barWidth + gap), (height - barHeight) / 2, barWidth, barHeight);
  }
}

function draw() {
  if (!analyser) return;
  const { width, height } = canvas.getBoundingClientRect();
  const values = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(values);
  context.clearRect(0, 0, width, height);
  const gap = 4;
  const count = Math.min(84, values.length);
  const barWidth = Math.max(1, (width - gap * (count - 1)) / count);
  for (let i = 0; i < count; i += 1) {
    const normalized = values[i] / 255;
    const barHeight = Math.max(5, normalized * height * 0.92);
    context.fillStyle = i < count * 0.18 ? "#ff5c35" : `rgba(232, 233, 229, ${0.25 + normalized * 0.75})`;
    context.fillRect(i * (barWidth + gap), (height - barHeight) / 2, barWidth, barHeight);
  }
  animationFrame = requestAnimationFrame(draw);
}

playButton.addEventListener("click", async () => {
  setupAudioGraph();
  if (audioContext.state === "suspended") await audioContext.resume();
  if (audio.paused) await audio.play();
  else audio.pause();
});

audio.addEventListener("play", () => {
  playButton.classList.add("is-playing");
  playButton.setAttribute("aria-label", "Pause reconstruction");
  cancelAnimationFrame(animationFrame);
  draw();
});

audio.addEventListener("pause", () => {
  playButton.classList.remove("is-playing");
  playButton.setAttribute("aria-label", "Play reconstruction");
  cancelAnimationFrame(animationFrame);
  drawIdle();
});

audio.addEventListener("loadedmetadata", () => {
  timeline.max = audio.duration;
  durationLabel.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
  timeline.value = audio.currentTime;
  currentTime.textContent = formatTime(audio.currentTime);
});

timeline.addEventListener("input", () => {
  audio.currentTime = Number(timeline.value);
});

muteButton.addEventListener("click", () => {
  audio.muted = !audio.muted;
  muteButton.setAttribute("aria-label", audio.muted ? "Unmute audio" : "Mute audio");
  muteButton.style.opacity = audio.muted ? ".45" : "1";
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
