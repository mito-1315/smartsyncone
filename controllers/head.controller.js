import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getHeadcount = (req, res) => {
    res.sendFile(path.join(__dirname, '../screens/headcount.html'));
};
