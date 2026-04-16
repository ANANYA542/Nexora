require('dotenv').config();
const app = require('./app');
const pool = require('./src/config/db');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {

    await pool.query('SELECT 1');
    console.log('Database connected');

    const server = await app.listen(PORT);
    const addr = server.address();
    console.log(`Server running on http://localhost:${addr.port}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);


    process.on('SIGTERM', async () => {
      console.log('SIGTERM received — closing server gracefully...');
      server.close(async () => {
        await pool.end();
        process.exit(0);
      });
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

start();

