const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const items = require('../data/items');

// 회원가입
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

// 인벤토리 초기값 자동 생성
 try {
const inventory = {};
for (const key in items) {
  inventory[key] = items[key].initial || 0; // initial 값 없으면 0
}

// 씨앗 지급 (예: cornSeed 5개만 따로)
inventory["cornSeed"] = 5;
console.log('items:', items);
console.log('초기화된 인벤토리:', inventory);
const newUser = new User({
  username,
  password: hash,
  gold: 500,
  farmXP: 0,
  farmLevel: 1,
  farm: {
    plots: Array(5).fill().map(() => Array(5).fill(null)) // 5x5 밭
  },
  inventory: {
    maxSlots: 10,
    slots: [
      { item: "cornSeed", amount: 5 },
      null, null, null, null,
      null, null, null, null, null
    ]
  }
});

    await newUser.save();
    res.redirect('/login');
  } catch (err) {
    res.send('회원가입 실패: ' + err.message);
  }
});

// 로그인
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) return res.send('사용자 없음');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.send('비밀번호 불일치');

  // ✅ 필요한 정보만 저장
  req.session.user = {
    _id: user._id,
    username: user.username
  };

  console.log("✅ 로그인된 유저 세션:", req.session.user);
  res.redirect('/farm');
});

module.exports = router;
