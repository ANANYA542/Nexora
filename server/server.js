require('dotenv').config();
const app = require('./app');
const pool = require('./src/config/db');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {

    await pool.query('SELECT 1');
    console.log('Database connected');

    const server = app.listen(PORT, () => {
      console.log(`Server successfully started on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

      const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
      if (RENDER_EXTERNAL_URL) {
        setInterval(() => {
          require('axios').get(`${RENDER_EXTERNAL_URL}/health`)
            .then(() => console.log(`[KEEP-ALIVE] Pinged ${RENDER_EXTERNAL_URL}/health`))
            .catch(err => console.error('[KEEP-ALIVE] Error:', err.message));
        }, 1000 * 60 * 14); // 14 minutes
      }
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

start();

