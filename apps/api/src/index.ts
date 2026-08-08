import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'api' });
});

app.listen(port, () => {
  console.log(`API service running on port ${port}`);
});
