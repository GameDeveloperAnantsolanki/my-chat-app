let signals = {}; // { username: [{from, signal}, ...]}

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { from, to, signal } = req.body;
    if (!signals[to]) signals[to] = [];
    signals[to].push({ from, signal });
    res.status(200).json({ success: true });
  } else if (req.method === 'GET') {
    const { user } = req.query;
    const userSignals = signals[user] || [];
    signals[user] = [];
    res.status(200).json(userSignals);
  } else res.status(405).end();
}
