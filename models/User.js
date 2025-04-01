const mongoose = require('mongoose');

const inventorySlotSchema = new mongoose.Schema({
  item: { type: String, required: true },
  amount: { type: Number, required: true }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  farmXP: { type: Number, default: 0 },
  farmLevel: { type: Number, default: 1 },
gold: { type: Number, default: 500 },
  farm: {
    plots: {
type: [[mongoose.Schema.Types.Mixed]],
default: () => Array(5).fill().map(() => Array(5).fill(null))
    }
  },
inventory: {
  maxSlots: { type: Number, default: 10 },
  slots: {
    type: [inventorySlotSchema],
    default: () => Array(10).fill(null),
    _id: false
  }
},

// ✅ 이제 여기서 village는 독립된 필드
village: {
  tiles: {
    type: [[String]],
    default: () => Array(5).fill().map(() => Array(5).fill(null))
  }
}
});

module.exports = mongoose.model('User', userSchema);
