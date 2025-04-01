// 먼저 app부터 선언해야 함!
const cookie = require("cookie");
const signature = require("cookie-signature");
const express = require('express');
const app = express(); // ✅ 이 줄을 최상단 근처에 위치시켜야 함
const http = require('http');
const mongoose = require('mongoose');
const session = require('express-session');
const cookieParser = require("cookie-parser");
const authRoutes = require('./routes/auth');
const User = require('./models/User');
const getLevelFromXP = require('./utils/level');
const items = require('./data/items');
const ChatMessage = require('./models/ChatMessage');
const MongoStore = require('connect-mongo');

const sessionStore = MongoStore.create({
  mongoUrl: 'mongodb://127.0.0.1:27017/farm-rpg',
  collectionName: 'sessions'
});

const sessionMiddleware = session({
  name: 'connect.sid', // ✅ 고정
  secret: 'farm-rpg-secret',
  resave: false,
  saveUninitialized: false,
store: MongoStore.create({
  mongoUrl: 'mongodb://127.0.0.1:27017/farm-rpg',
  collectionName: 'sessions'
}),

  cookie: {
    httpOnly: true,
    secure: false
  }
});

require('dotenv').config();

app.use(cookieParser());
app.use(sessionMiddleware);

const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // 클라이언트 주소
    credentials: true
  }
});



app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB 연결 완료'));

app.use('/', authRoutes);

app.get('/login', (req, res) => res.render('login'));
app.get('/register', (req, res) => res.render('register'));
app.get('/farm', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const user = await User.findById(req.session.user._id).lean();

// 골드 기본값 보장
if (user.gold === undefined) {
  user.gold = 500;
  await User.updateOne({ _id: user._id }, { $set: { gold: 500 } });
}


  // ✅ village.tiles 기본값이 없으면 만들어주기
  if (!user.village || !Array.isArray(user.village.tiles)) {
    user.village = {
      tiles: Array(5).fill().map(() => Array(5).fill(null))
    };
  }

  // ✅ 인벤토리 기본값 보장
  if (!user.inventory || !Array.isArray(user.inventory.slots)) {
    user.inventory = {
      maxSlots: 10,
      slots: Array(10).fill(null)
    };
  }

  // ✅ plots 따로 꺼내기
  const plots = user.farm?.plots || [];

  // ✅ items 정의 (items.js에서 가져온 것)
  const cropItems = items; // require('./data/items') 에서 가져온 것
console.log("🎒 인벤토리 슬롯 상태:", user.inventory.slots);
  res.render('farm', {
    user,
    plots,
    items: cropItems // EJS에서 사용할 수 있게 넘기기
  });
});

app.get("/chat/logs", async (req, res) => {
  const logs = await ChatMessage.find().sort({ timestamp: 1 }).limit(50);
  res.json(logs);
});


app.get('/village', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const user = await User.findById(req.session.user._id).lean();

  // 마을 tiles 기본값 보장 (혹시 null인 경우 대비)
  if (!user.village || !Array.isArray(user.village.tiles)) {
    user.village = {
      tiles: Array(5).fill().map(() => Array(5).fill(null))
    };
  }

  res.render('village', {
    user
  });
});

app.post('/plant', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const user = await User.findById(req.session.user._id);
  const plots = user.farm.plots;

  const seedName = req.body.seedName;
const cropMap = {
  cornSeed: "corn",
  carrotSeed: "carrot"
};
const cropName = cropMap[seedName];

  // ✅ 씨앗 슬롯 찾기 (amount > 0)
  const seedSlotIndex = user.inventory.slots.findIndex(slot => slot && slot.item === seedName && slot.amount > 0);

  if (seedSlotIndex === -1) {
    // 씨앗 없음 → 종료
    return res.redirect('/farm');
  }

  // ✅ 빈 밭 칸에 심기
  outer:
  for (let y = 0; y < plots.length; y++) {
    for (let x = 0; x < plots[y].length; x++) {
      if (
        !plots[y][x] ||
        plots[y][x] === null ||
        (typeof plots[y][x] === 'string' && plots[y][x].trim() === '')
      ) {
        plots[y][x] = {
          crop: cropName,
          plantedAt: Date.now()
        };

        // ✅ 순서 주의!
        const currentAmount = user.inventory.slots[seedSlotIndex].amount - 1;

        if (currentAmount <= 0) {
          user.inventory.slots[seedSlotIndex] = null;
        } else {
          user.inventory.slots[seedSlotIndex].amount = currentAmount;
        }

        break outer;
      }
    }
  }

  user.farm.plots = plots;
  await user.save();

  res.redirect('/farm');
});


app.post('/harvest', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const user = await User.findById(req.session.user._id);
  const plots = user.farm.plots;

  for (let y = 0; y < plots.length; y++) {
    for (let x = 0; x < plots[y].length; x++) {
      const plot = plots[y][x];
      if (
        plot &&
        plot.crop &&
        items[plot.crop]
      ) {
        const cropInfo = items[plot.crop];
        const plantedAt = new Date(plot.plantedAt).getTime();
        const now = Date.now();
        const growTime = cropInfo.growTime;

        // ✅ 아직 덜 자란 건 건너뛰기
        if (now - plantedAt < growTime) continue;

        const harvestedItem = plot.crop;

        // ✅ 인벤토리 슬롯에 수확물 추가
        let added = false;
        for (let i = 0; i < user.inventory.slots.length; i++) {
          const slot = user.inventory.slots[i];
          if (slot && slot.item === harvestedItem) {
            slot.amount++;
            added = true;
            break;
          }
        }

        // ✅ 기존 슬롯에 없으면 빈 슬롯에 새로 추가
        if (!added) {
          const emptyIndex = user.inventory.slots.findIndex(s => s === null);
          if (emptyIndex !== -1) {
            user.inventory.slots[emptyIndex] = {
              item: harvestedItem,
              amount: 1
            };
          }
        }

        // ✅ 수확 완료 → 밭 초기화
        plots[y][x] = null;

        // ✅ XP 추가
        user.farmXP += cropInfo.xp;
      }
    }
  }

  user.farmLevel = getLevelFromXP(user.farmXP);
  user.farm.plots = plots;
  await user.save();

  res.redirect('/farm');
});


app.post('/village/build', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const { y, x, building } = req.body;
  const user = await User.findById(req.session.user._id);

  // 안전 체크
  const yy = parseInt(y, 10);
  const xx = parseInt(x, 10);

  if (!user.village || !Array.isArray(user.village.tiles)) {
    user.village = {
      tiles: Array(5).fill().map(() => Array(5).fill(null))
    };
  }

  user.village.tiles[yy][xx] = building;
  await user.save();

  res.redirect('/farm');
});

// 채팅 로직
io.on("connection", async (socket) => {
  const cookies = socket.handshake.headers.cookie;
  const parsedCookies = cookie.parse(cookies || "");

  const raw = parsedCookies['connect.sid'];

  if (!raw) {
    console.log("❌ 세션 쿠키 없음");
    return;
  }

  const sid = raw.startsWith('s:')
    ? signature.unsign(raw.slice(2), 'farm-rpg-secret') // 세션 secret과 동일해야 함
    : null;

  if (!sid) {
    console.log("❌ 서명 해독 실패");
    return;
  }

  const sessionData = await new Promise((resolve, reject) => {
  sessionStore.get(sid, (err, session) => { // ✅ store 직접 사용
    if (err) return reject(err);
    resolve(session);
  });
});


  const username = sessionData?.user?.username || "익명";
  console.log("🧾 세션:", sessionData);
  console.log("🧑‍🌾 접속한 유저:", username);

  socket.on("chat message", async (msg) => {
    const fullMsg = `${username}: ${msg}`;
    io.emit("chat message", fullMsg);
    await ChatMessage.create({ username, message: msg });
  });
});



server.listen(3000, () => {
  console.log('서버 실행 중: http://localhost:3000');
});

