const listeners = new WeakMap();

function onEvent(target, name, cb) {
  const store = listeners.get(target) ?? {};
  store[name] = store[name] ?? [];
  store[name].push(cb);
  listeners.set(target, store);
}

function emitEvent(target, name, payload) {
  const store = listeners.get(target);
  if (!store || !store[name]) return;
  for (const cb of store[name]) cb(payload);
}

function makeBody(type, x, y, options = {}) {
  return {
    type,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    angle: options.angle ?? 0,
    width: options.width,
    height: options.height,
    radius: options.radius,
    isStatic: !!options.isStatic,
    restitution: options.restitution ?? 0.2,
    frictionAir: options.frictionAir ?? 0.01,
    render: options.render ?? { fillStyle: '#fff' },
  };
}

export const Engine = {
  create() {
    return { world: { bodies: [] }, gravity: { x: 0, y: 1 }, timing: { delta: 16.666 } };
  },
};

export const Bodies = {
  rectangle(x, y, width, height, options = {}) {
    return makeBody('rectangle', x, y, { ...options, width, height });
  },
  circle(x, y, radius, options = {}) {
    return makeBody('circle', x, y, { ...options, radius });
  },
};

export const Body = {
  applyForce(body, _point, force) {
    if (body.isStatic) return;
    body.velocity.x += force.x * 100;
    body.velocity.y += force.y * 100;
  },
  setAngle(body, angle) {
    body.angle = angle;
  },
};

export const Composite = {
  add(world, bodies) {
    const items = Array.isArray(bodies) ? bodies : [bodies];
    world.bodies.push(...items);
  },
  remove(world, body) {
    world.bodies = world.bodies.filter((candidate) => candidate !== body);
  },
};

export const World = Composite;

export const Events = {
  on: onEvent,
};

function intersectsCircleCircle(a, b) {
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;
  return dx * dx + dy * dy <= (a.radius + b.radius) ** 2;
}

function intersectsCircleRect(circle, rect) {
  const hw = rect.width / 2;
  const hh = rect.height / 2;
  const cx = Math.max(rect.position.x - hw, Math.min(circle.position.x, rect.position.x + hw));
  const cy = Math.max(rect.position.y - hh, Math.min(circle.position.y, rect.position.y + hh));
  const dx = circle.position.x - cx;
  const dy = circle.position.y - cy;
  return dx * dx + dy * dy <= circle.radius ** 2;
}

function bounce(ball, body) {
  if (body.type === 'circle') {
    const nx = ball.position.x - body.position.x;
    const ny = ball.position.y - body.position.y;
    const len = Math.max(1, Math.hypot(nx, ny));
    const ux = nx / len;
    const uy = ny / len;
    const dot = ball.velocity.x * ux + ball.velocity.y * uy;
    ball.velocity.x -= 2 * dot * ux;
    ball.velocity.y -= 2 * dot * uy;
  } else {
    if (Math.abs(ball.position.x - body.position.x) > Math.abs(ball.position.y - body.position.y)) {
      ball.velocity.x *= -1;
    } else {
      ball.velocity.y *= -1;
    }
  }
  const factor = 1 + (body.restitution ?? 0.2) * 0.3;
  ball.velocity.x *= factor;
  ball.velocity.y *= factor;
}

export const Runner = {
  create() {
    return { running: false, frame: null };
  },
  run(runner, engine) {
    const step = () => {
      const balls = engine.world.bodies.filter((b) => !b.isStatic);
      const statics = engine.world.bodies.filter((b) => b.isStatic);
      const pairs = [];

      for (const ball of balls) {
        ball.velocity.y += engine.gravity.y * 0.32;
        ball.velocity.x *= 1 - ball.frictionAir;
        ball.velocity.y *= 1 - ball.frictionAir;
        ball.position.x += ball.velocity.x;
        ball.position.y += ball.velocity.y;

        for (const body of statics) {
          const hit = body.type === 'circle'
            ? intersectsCircleCircle(ball, body)
            : intersectsCircleRect(ball, body);
          if (hit) {
            bounce(ball, body);
            pairs.push({ bodyA: ball, bodyB: body });
          }
        }
      }

      if (pairs.length) {
        emitEvent(engine, 'collisionStart', { pairs });
      }

      emitEvent(engine, 'afterUpdate', {});
      emitEvent(engine, '__render', {});
      runner.frame = requestAnimationFrame(step);
    };

    if (!runner.running) {
      runner.running = true;
      runner.frame = requestAnimationFrame(step);
    }
  },
};

export const Render = {
  create({ canvas, engine, options }) {
    return {
      canvas,
      engine,
      context: canvas.getContext('2d'),
      options,
    };
  },
  run(render) {
    const { context, canvas, engine } = render;
    Events.on(engine, '__render', () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      engine.world.bodies.forEach((body) => {
        context.save();
        context.translate(body.position.x, body.position.y);
        context.rotate(body.angle || 0);
        context.fillStyle = body.render?.fillStyle ?? '#fff';
        if (body.type === 'circle') {
          context.beginPath();
          context.arc(0, 0, body.radius, 0, Math.PI * 2);
          context.fill();
        } else {
          context.fillRect(-body.width / 2, -body.height / 2, body.width, body.height);
        }
        context.restore();
      });
    });
  },
};
