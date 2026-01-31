import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/', (req, res) => res.send('Backend OK!'));

app.listen(3000, () => console.log('Backend em http://localhost:3000'));
