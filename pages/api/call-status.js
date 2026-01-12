import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data', 'call.json');

export default function handler(req, res) {
  if (req.method === 'GET') {
    const callStatus = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.status(200).json(callStatus);
  } else if (req.method === 'POST') {
    const { active, host, participants } = req.body;
    const callStatus = {
      active: !!active,
      host: host || null,
      participants: participants || []
    };
    fs.writeFileSync(filePath, JSON.stringify(callStatus, null, 2));
    res.status(200).json({ success: true });
  } else res.status(405).end();
}
