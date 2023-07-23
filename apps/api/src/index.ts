import logger from '@retake/logger';
import Postgres from '@retake/postgres';
import App from './App';

(async () => {
  try {
    await Postgres.init();
    logger.info('Connected to database.');

    new App().start();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
})();
