const canvas = document.querySelector("#signal-field");
const context = canvas.getContext("2d");
const root = document.documentElement;

let width = 0;
let height = 0;
let deviceScale = 1;
let points = [];
let pointer = { x: 0.5, y: 0.5, active: false };

function resize() {
  deviceScale = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * deviceScale);
  canvas.height = Math.floor(height * deviceScale);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);

  const count = Math.max(48, Math.floor((width * height) / 23000));
  points = Array.from({ length: count }, (_, index) => ({
    x: (Math.sin(index * 98.23) * 0.5 + 0.5) * width,
    y: (Math.cos(index * 41.91) * 0.5 + 0.5) * height,
    radius: 1 + (index % 5) * 0.42,
    phase: index * 0.31,
    speed: 0.18 + (index % 7) * 0.035,
  }));
}

function draw(time) {
  const seconds = time / 1000;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "rgba(7, 6, 6, 0.28)";
  context.fillRect(0, 0, width, height);

  const pulseX = pointer.active ? pointer.x * width : width * (0.5 + Math.sin(seconds * 0.16) * 0.24);
  const pulseY = pointer.active ? pointer.y * height : height * (0.48 + Math.cos(seconds * 0.11) * 0.18);

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const driftX = Math.sin(seconds * point.speed + point.phase) * 18;
    const driftY = Math.cos(seconds * point.speed * 0.78 + point.phase) * 14;
    const x = point.x + driftX;
    const y = point.y + driftY;
    const distance = Math.hypot(pulseX - x, pulseY - y);
    const heat = Math.max(0, 1 - distance / 390);

    context.beginPath();
    context.arc(x, y, point.radius + heat * 2.4, 0, Math.PI * 2);
    context.fillStyle = `rgba(255, ${64 + heat * 90}, ${47 + heat * 20}, ${0.18 + heat * 0.55})`;
    context.fill();

    if (heat > 0.18) {
      context.beginPath();
      context.moveTo(pulseX, pulseY);
      context.lineTo(x, y);
      context.strokeStyle = `rgba(182, 255, 90, ${Math.min(0.28, heat * 0.18)})`;
      context.lineWidth = 1;
      context.stroke();
    }
  }

  context.beginPath();
  context.arc(pulseX, pulseY, 120 + Math.sin(seconds * 1.7) * 28, 0, Math.PI * 2);
  context.strokeStyle = "rgba(255, 59, 47, 0.24)";
  context.lineWidth = 2;
  context.stroke();

  requestAnimationFrame(draw);
}

function updatePointer(event) {
  pointer = {
    x: event.clientX / Math.max(width, 1),
    y: event.clientY / Math.max(height, 1),
    active: true,
  };
  root.style.setProperty("--pointer-x", pointer.x.toString());
  root.style.setProperty("--pointer-y", pointer.y.toString());
}

window.addEventListener("resize", resize);
window.addEventListener("pointermove", updatePointer);
window.addEventListener("pointerleave", () => {
  pointer.active = false;
});

resize();
requestAnimationFrame(draw);