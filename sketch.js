const pace = 1; // 調大更快，例如 1.5
const paper = "#f4f1eb";

let blocks = [];
let index = 0;
let phase = "grow";
let started = 0;

function setup() {
  createCanvas(800, 480);
  pixelDensity(1);
  frameRate(60);
  noStroke();

  newComposition();
}

function area(b) {
  return b.w * b.h;
}

// 將 HSL 數值轉成漸層可用的顏色
function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function newComposition() {
  const horizontal = random() < 0.5;

  // 保留一條長色帶
  const bandSize = horizontal
    ? floor(random(38, 65))
    : floor(random(35, 60));

  const atEnd = random() < 0.5;

  let band;
  let main;

  if (horizontal) {
    band = {
      x: 0,
      y: atEnd ? height - bandSize : 0,
      w: width,
      h: bandSize
    };

    main = {
      x: 0,
      y: atEnd ? 0 : bandSize,
      w: width,
      h: height - bandSize
    };
  } else {
    band = {
      x: atEnd ? width - bandSize : 0,
      y: 0,
      w: bandSize,
      h: height
    };

    main = {
      x: atEnd ? 0 : bandSize,
      y: 0,
      w: width - bandSize,
      h: height
    };
  }

  blocks = [main];
  const mainCount = floor(random(5, 8));

  // 迴圈：切割畫布，生成不同大小的矩形
  while (blocks.length < mainCount) {
    const candidates = blocks
      .filter(b => b.w >= 160 || b.h >= 160)
      .sort((a, b) => area(b) - area(a));

    if (candidates.length === 0) break;

    const b = random(candidates.slice(0, 2));
    blocks.splice(blocks.indexOf(b), 1);

    let vertical;

    if (b.w / b.h > 1.2) {
      vertical = true;
    } else if (b.h / b.w > 1.2) {
      vertical = false;
    } else {
      vertical = random() < 0.5;
    }

    if (b.w < 160) vertical = false;
    if (b.h < 160) vertical = true;

    // 不對稱比例，形成大片與細長色塊
    const ratio = random([0.2, 0.28, 0.72, 0.8]);

    if (vertical) {
      const cut = round(b.w * ratio);

      blocks.push(
        {
          x: b.x,
          y: b.y,
          w: cut,
          h: b.h
        },
        {
          x: b.x + cut,
          y: b.y,
          w: b.w - cut,
          h: b.h
        }
      );
    } else {
      const cut = round(b.h * ratio);

      blocks.push(
        {
          x: b.x,
          y: b.y,
          w: b.w,
          h: cut
        },
        {
          x: b.x,
          y: b.y + cut,
          w: b.w,
          h: b.h - cut
        }
      );
    }
  }

  blocks.sort((a, b) => area(b) - area(a));

  // 每輪隨機生成柔和的配色
  const baseHue = random([25, 45, 145, 185, 215, 335]);

  const offsets = random([
    [0, 20, 40],
    [0, -25, 160]
  ]);

  blocks.forEach((b, i) => {
    const hue =
      baseHue +
      offsets[i % offsets.length] +
      random(-8, 8);

    const saturation = random(15, 28);

    if (i === 0) {
      // 最大色塊：接近紙色
      b.stops = [
        [0, hsl(hue, 12, 82)],
        [1, hsl(hue + 5, 15, 94)]
      ];
    } else if (i === blocks.length - 1) {
      // 最小色塊：炭灰色，作為視覺重心
      b.stops = [
        [0, hsl(baseHue, 12, 20)],
        [1, hsl(baseHue + 10, 16, 35)]
      ];
    } else {
      // 其他色塊：低飽和、細緻漸層
      const lightness = random(58, 72);

      b.stops = [
        [0, hsl(hue, saturation, lightness)],
        [1, hsl(hue + 6, saturation - 4, lightness + 12)]
      ];
    }

    // 大色塊較慢，小色塊較快
    b.duration = map(
      area(b),
      0,
      width * height,
      420,
      1100
    ) / pace;
  });

  // 從右上方開始，依序生成
  blocks.sort((a, b) => {
    const scoreA =
      (width - a.x - a.w / 2) / width +
      (a.y + a.h / 2) / height;

    const scoreB =
      (width - b.x - b.w / 2) / width +
      (b.y + b.h / 2) / height;

    return scoreA - scoreB;
  });

  // 長色帶使用同一組配色，最後出現
  const bandHue = baseHue + random(offsets);

  band.stops = [
    [0, hsl(bandHue, 28, 65)],
    [1, hsl(bandHue + 8, 22, 79)]
  ];

  band.duration = 850 / pace;
  blocks.push(band);

  index = 0;
  phase = "grow";
  started = millis();
}

// 平滑加速與減速
function ease(t) {
  t = constrain(t, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function paintBlock(b, p = 1) {
  p = constrain(p, 0, 1);

  // 寬、高同時縮放
  const w = b.w * p;
  const h = b.h * p;

  if (w <= 0 || h <= 0) return;

  // 固定右上角，向左下方放大
  const x = b.x + b.w - w;
  const y = b.y;

  const ctx = drawingContext;
  ctx.save();

  // 漸層跟著色塊一起縮放
  const gradient = ctx.createLinearGradient(
    x, y,
    x, y + h
  );

  // 迴圈：加入漸層色彩節點
  for (const [position, shade] of b.stops) {
    gradient.addColorStop(position, shade);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);

  ctx.restore();
}

function draw() {
  background(paper);

  const elapsed = millis() - started;

  // 填滿後停留，展示完整構圖
  if (phase === "hold") {
    for (const b of blocks) {
      paintBlock(b);
    }

    if (elapsed >= 1200 / pace) {
      phase = "shrink";
      index = blocks.length - 1;
      started = millis();
    }

    return;
  }

  // 已完成的色塊保持不動
  for (let i = 0; i < index; i++) {
    paintBlock(blocks[i]);
  }

  // 一次只縮放一個色塊
  const b = blocks[index];

  const duration = phase === "grow"
    ? b.duration
    : b.duration * 0.5;

  const p = ease(elapsed / duration);

  paintBlock(
    b,
    phase === "grow" ? p : 1 - p
  );

  if (elapsed >= duration) {
    started = millis();

    if (phase === "grow") {
      index++;

      if (index === blocks.length) {
        phase = "hold";
      }
    } else {
      index--;

      if (index < 0) {
        newComposition();
      }
    }
  }
}