import express from 'express';
import { servicesRouter } from './routes/services';
import { incidentsRouter } from './routes/incidents';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'api' });
});

app.use('/services', servicesRouter);
app.use('/incidents', incidentsRouter);

app.listen(port, () => {
  console.log(`API service running on port ${port}`);
});
