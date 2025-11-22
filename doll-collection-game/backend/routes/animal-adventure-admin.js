// animal-adventure-admin.js
router.get('/stats', async (req, res) => {
  try {
    const stats = await GameStats.find().sort({ date: -1 }).limit(30);
    const recentRounds = await GameRound.find().sort({ roundId: -1 }).limit(10);
    
    res.json({
      dailyStats: stats,
      recentRounds: recentRounds
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
