import {
  Bodies,
  Body,
  Composite,
  Engine,
  Events,
  Render,
  Runner,
  World,
} from '/node_modules/matter-js/index.js';

const WIDTH = 420;
const HEIGHT = 720;
const BALL_START = { x: WIDTH - 40, y: HEIGHT - 120 };

const engine = Engine.create();
engine.gravity.y = 1;
const world = engine.world;

const canvas = document.querySelector('#game');
canvas.width = WIDTH;
canvas.height = HEIGHT;

const render = Render.create({
  canvas,
  engine,
  options: {
    width: WIDTH,
    height: HEIGHT,
    wireframes: false,
    background: 'transparent',
  },
});

const wallStyle = { fillStyle: '#8ca0d7' };
const bumperStyle = { fillStyle: '#f25f5c' };
const flipperStyle = { fillStyle: '#ffe066' };
const ballStyle = { fillStyle: '#ffffff' };

const walls = [
  Bodies.rectangle(WIDTH / 2, HEIGHT + 25, WIDTH, 50, { isStatic: true, render: wallStyle }),
  Bodies.rectangle(-20, HEIGHT / 2, 40, HEIGHT, { isStatic: true, render: wallStyle }),
  Bodies.rectangle(WIDTH + 20, HEIGHT / 2, 40, HEIGHT, { isStatic: true, render: wallStyle }),
  Bodies.rectangle(WIDTH / 2, -20, WIDTH, 40, { isStatic: true, render: wallStyle }),
  Bodies.rectangle(WIDTH / 2 - 80, HEIGHT - 10, 140, 20, {
    isStatic: true,
    angle: -0.45,
    render: wallStyle,
  }),
  Bodies.rectangle(WIDTH / 2 + 80, HEIGHT - 10, 140, 20, {
    isStatic: true,
    angle: 0.45,
    render: wallStyle,
  }),
];

const bumpers = [
  Bodies.circle(WIDTH / 2, 190, 24, { isStatic: true, restitution: 1.2, render: bumperStyle }),
  Bodies.circle(WIDTH / 2 - 90, 280, 22, { isStatic: true, restitution: 1.2, render: bumperStyle }),
  Bodies.circle(WIDTH / 2 + 90, 280, 22, { isStatic: true, restitution: 1.2, render: bumperStyle }),
];

const leftFlipper = Bodies.rectangle(WIDTH / 2 - 65, HEIGHT - 90, 90, 16, {
  chamfer: 8,
  isStatic: true,
  angle: 0.35,
  render: flipperStyle,
});

const rightFlipper = Bodies.rectangle(WIDTH / 2 + 65, HEIGHT - 90, 90, 16, {
  chamfer: 8,
  isStatic: true,
  angle: -0.35,
  render: flipperStyle,
});

let ball = createBall();
let score = 0;
let balls = 3;

const scoreEl = document.querySelector('#score');
const ballsEl = document.querySelector('#balls');

function createBall() {
  return Bodies.circle(BALL_START.x, BALL_START.y, 11, {
    restitution: 0.4,
    friction: 0.001,
    frictionAir: 0.001,
    density: 0.0025,
    render: ballStyle,
  });
}

function resetBall() {
  if (balls <= 0) {
    return;
  }
  if (ball) {
    Composite.remove(world, ball);
  }
  ball = createBall();
  Composite.add(world, ball);
}

function updateHud() {
  scoreEl.textContent = `Score: ${score}`;
  ballsEl.textContent = balls > 0 ? `Balls: ${balls}` : 'Game Over';
}

function launchBall() {
  if (!ball || Math.abs(ball.position.x - BALL_START.x) > 8 || Math.abs(ball.position.y - BALL_START.y) > 8) {
    return;
  }
  Body.applyForce(ball, ball.position, { x: -0.015, y: -0.045 });
}

function setFlipperState(isLeft, active) {
  if (isLeft) {
    Body.setAngle(leftFlipper, active ? -0.35 : 0.35);
  } else {
    Body.setAngle(rightFlipper, active ? 0.35 : -0.35);
  }
}

Events.on(engine, 'collisionStart', ({ pairs }) => {
  pairs.forEach((pair) => {
    const hitsBall = pair.bodyA === ball || pair.bodyB === ball;
    const hitsBumper = bumpers.includes(pair.bodyA) || bumpers.includes(pair.bodyB);

    if (hitsBall && hitsBumper) {
      score += 100;
      updateHud();
    }
  });
});

Events.on(engine, 'afterUpdate', () => {
  if (ball && ball.position.y > HEIGHT + 30) {
    balls -= 1;
    updateHud();
    resetBall();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'ArrowLeft') {
    setFlipperState(true, true);
  }
  if (event.code === 'ArrowRight') {
    setFlipperState(false, true);
  }
  if (event.code === 'Space') {
    launchBall();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'ArrowLeft') {
    setFlipperState(true, false);
  }
  if (event.code === 'ArrowRight') {
    setFlipperState(false, false);
  }
});

World.add(world, [...walls, ...bumpers, leftFlipper, rightFlipper, ball]);
updateHud();
Render.run(render);
Runner.run(Runner.create(), engine);
