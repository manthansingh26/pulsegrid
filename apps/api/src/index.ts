import express from 'express';
import { servicesRouter } from './routes/services';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'api' });
});

app.use('/services', servicesRouter);

app.listen(port, () => {
  console.log(`API service running on port ${port}`);
});
