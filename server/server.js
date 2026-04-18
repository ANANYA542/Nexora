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
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

start();

