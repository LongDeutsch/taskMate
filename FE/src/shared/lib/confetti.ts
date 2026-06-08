const PASTEL_COLORS = ["#FFB5C2", "#FFD6A5", "#FDFFB6", "#CAFFBF", "#9BF6FF", "#BDB2FF", "#FFC6FF"];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  spin: number;
  life: number;
};

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let rafId = 0;
let particles: Particle[] = [];
let running = false;

function ensureCanvas() {
  if (canvas && ctx) return;
  canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999";
  ctx = canvas.getContext("2d");
}

function resizeCanvas() {
  if (!canvas || !ctx) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function spawnParticles(count: number) {
  if (!canvas) return;
  const w = canvas.width;
  const h = canvas.height;
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x: w * (0.2 + Math.random() * 0.6),
      y: h * 0.15 + Math.random() * h * 0.1,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 3 + 2,
      color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)]!,
      size: 4 + Math.random() * 5,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.2,
      life: 1,
    });
  }
}

function tick() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles = particles.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.vx *= 0.99;
    p.rotation += p.spin;
    p.life -= 0.018;

    if (p.life <= 0) return false;

    ctx!.save();
    ctx!.translate(p.x, p.y);
    ctx!.rotate(p.rotation);
    ctx!.globalAlpha = Math.min(1, p.life);
    ctx!.fillStyle = p.color;
    ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    ctx!.restore();
    return true;
  });

  if (particles.length > 0) {
    rafId = requestAnimationFrame(tick);
  } else {
    stopConfetti();
  }
}

function stopConfetti() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  particles = [];
  canvas?.remove();
  canvas = null;
  ctx = null;
}

/** Hiệu ứng confetti nhẹ ~1.5 giây, có thể gọi nhiều lần trong ngày. */
export function playLightConfetti(durationMs = 1500) {
  ensureCanvas();
  if (!canvas || !ctx) return;

  if (!running) {
    running = true;
    resizeCanvas();
    document.body.appendChild(canvas);
    window.addEventListener("resize", resizeCanvas);
    tick();
  }

  spawnParticles(36);

  window.setTimeout(() => {
    window.removeEventListener("resize", resizeCanvas);
  }, durationMs + 200);
}
