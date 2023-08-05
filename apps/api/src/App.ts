import express, { Application, Router } from 'express';

import {
  AuthService,
  BillingService,
  S3Service,
  SageService,
  VideoService
} from '@retake/core';
import logger from '@retake/logger';
import {
  BalanceRepository,
  ClipRepository,
  EditRepository,
  FileRepository,
  JobRepository,
  PaymentRepository,
  RenderRepository,
  UserRepository,
  VideoRepository
} from '@retake/postgres';
import { authCookieName } from '@retake/shared';
import cors from 'cors';
import session from 'express-session';
import { RedisClientType } from 'redis';
import config, { webhookEndpoint } from './config';
import AuthController from './controllers/AuthController';
import VideoController from './controllers/VideoController';
import WebhookController from './controllers/WebhookController';
import errorHandler from './middleware/errorHandler';
import requestLogger from './middleware/requestLogger';
import initRoutes from './routes';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const connectRedis = require('connect-redis')(session);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const connectSQLite = require('connect-sqlite3')(session);

class App {
  app: Application;

  constructor(redis?: RedisClientType) {
    const app: Application = express();

    app.set('trust proxy', true);

    app.use(
      cors({
        origin: config.app.clientUrl,
        credentials: true,
        maxAge: 86400
      })
    );

    let store = new connectSQLite({
      db: 'sessions.sqlite'
    });

    if (redis) {
      store = new connectRedis({
        client: redis
      });

      logger.info('Using Redis for session storage.');
    }

    app.use(
      session({
        name: authCookieName,
        secret: config.auth.secret,
        store,
        resave: false,
        saveUninitialized: false,
        cookie: {
          sameSite: config.app.isSecure ? 'none' : 'lax',
          secure: config.app.isSecure,
          maxAge: config.auth.expiry
        }
      })
    );

    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    app.disable('x-powered-by');

    app.get('/health', (req, res) => {
      res.status(200).send('Ok');
    });

    app.use(requestLogger);

    const balanceRepository = new BalanceRepository();
    const clipRepository = new ClipRepository();
    const editRepository = new EditRepository();
    const fileRepository = new FileRepository();
    const jobRepository = new JobRepository();
    const paymentRepository = new PaymentRepository();
    const renderRepository = new RenderRepository();
    const userRepository = new UserRepository();
    const videoRepository = new VideoRepository();

    const authService = new AuthService(userRepository);
    const billingService = new BillingService(
      balanceRepository,
      paymentRepository
    );
    const sageService = new SageService(config.sage.apiUrl, {
      webhookUrl: webhookEndpoint()
    });
    const videoS3 = new S3Service(
      config.s3.videoBucket.name,
      config.s3.videoBucket.region
    );
    const videoService = new VideoService(
      userRepository,
      videoRepository,
      fileRepository,
      jobRepository,
      sageService,
      billingService,
      videoS3
    );

    const authController = new AuthController(authService);
    const videoController = new VideoController(videoService);
    const webhookController = new WebhookController(videoService);

    const router = Router();
    initRoutes(router, authController, videoController, webhookController);

    app.use('/v1', router);

    app.use(errorHandler);

    this.app = app;
  }

  getInstance = (): Application => this.app;

  onError(err: string) {
    logger.error(`Could not start app. ${err}`);
  }

  start() {
    const { protocol, host, port } = config.app;

    this.app
      .listen(port, host, () => {
        logger.info(`App running at ${protocol}://${host}:${port}`);
      })
      .on('error', this.onError);
  }
}

export default App;
