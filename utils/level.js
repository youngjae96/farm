function getLevelFromXP(xp) {
  if (xp < 100) return 1;
  if (xp < 300) return 2;
  if (xp < 600) return 3;
  return 4;
}

module.exports = getLevelFromXP;
