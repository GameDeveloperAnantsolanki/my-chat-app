import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data', 'messages.json');

export default function handler(req, res) {
  if (req.method === 'GET') {
    const messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.status(200).json(messages);
  } else if (req.method === 'POST') {
    const { user, text } = req.body;
    if (!user || !text) return res.status(400).json({ error: 'Missing user or text' });

    const messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    messages.push({ user, text, time: new Date().toISOString() });
    fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));

    res.status(200).json({ success: true });
  } else res.status(405).end();
}
