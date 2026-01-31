import express from 'express';
import cors from 'cors';

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('Backend OK!'));

app.listen(2173, () => console.log('Backend em localhost'));
