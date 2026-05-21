const canvas = document.querySelector("#signal-field");
const context = canvas.getContext("2d");
const root = document.documentElement;

let width = 0;
let height = 0;
let deviceScale = 1;
let points = [];
let pointer = { x: 0.5, y: 0.5, active: false };
let lastScrollY = window.scrollY;
const navigationLinks = Array.from(document.querySelectorAll(".nav-links a[href^='#']"));
const navigationTargets = navigationLinks
  .map((link) => ({
    link,
    section: document.getElementById(decodeURIComponent(link.getAttribute("href").slice(1))),
  }))
  .filter((target) => target.section);

function calculateAge(birthDate, today = new Date()) {
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

  if (today < birthdayThisYear) {
    age -= 1;
  }

  return age;
}

function updateDynamicAge() {
  const ageElement = document.querySelector(".dynamic-age[data-birthdate]");

  if (!ageElement) {
    return;
  }

  const [year, month, day] = ageElement.dataset.birthdate.split("-").map(Number);
  const birthDate = new Date(year, month - 1, day);

  if (Number.isNaN(birthDate.getTime())) {
    return;
  }

  ageElement.textContent = calculateAge(birthDate).toString();
}

function updateTopMarquee() {
  const currentScrollY = window.scrollY;
  const isScrollingDown = currentScrollY > lastScrollY;

  if (currentScrollY <= 8 || currentScrollY < lastScrollY) {
    document.body.classList.remove("top-marquee-hidden");
  } else if (currentScrollY > 48 && isScrollingDown) {
    document.body.classList.add("top-marquee-hidden");
  }

  lastScrollY = Math.max(currentScrollY, 0);
}

function updateActiveNavigation() {
  if (!navigationTargets.length) {
    return;
  }

  const activationLine = window.innerHeight * 0.36;
  let activeTarget = navigationTargets[0];

  for (const target of navigationTargets) {
    if (target.section.getBoundingClientRect().top <= activationLine) {
      activeTarget = target;
    }
  }

  navigationLinks.forEach((link) => {
    link.classList.toggle("active", link === activeTarget.link);
  });
}

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

window.addEventListener("resize", () => {
  resize();
  updateActiveNavigation();
});
window.addEventListener("pointermove", updatePointer);
window.addEventListener("pointerleave", () => {
  pointer.active = false;
});
window.addEventListener("scroll", updateTopMarquee, { passive: true });
window.addEventListener("scroll", updateActiveNavigation, { passive: true });

updateDynamicAge();
updateTopMarquee();
updateActiveNavigation();
resize();
requestAnimationFrame(draw);