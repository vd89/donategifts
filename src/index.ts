import path from 'node:path';

import MongoStore from 'connect-mongo';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import session from 'express-session';

import { routes as apiRoutes } from './api';
import BaseController from './controller/basecontroller';
import MongooseConnection from './db/connection';
import config from './helper/config';
import logger from './helper/logger';
import { routes } from './routes';

const limiter = new BaseController().limiter;

const app = express();

(async () => {
	await new MongooseConnection().connect();

	app.set('trust proxy', 1);

	app.use(cors());

	app.set('views', path.join(__dirname, '../views'));
	app.set('view engine', 'pug');

	app.use(express.static('public'));

	if (config.NODE_ENV === 'development') {
		app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
	}

	app.use(
		session({
			store: MongoStore.create({
				mongoUrl: config.MONGO_URI,
				autoRemove: 'interval',
				// interval is now in minutes
				autoRemoveInterval: 60,
			}),
			name: config.SESSION.NAME,
			resave: false,
			saveUninitialized: false,
			secret: config.SESSION.SECRET,
			cookie: {
				maxAge: config.SESSION.LIFE,
				sameSite: true,
				secure: false,
			},
		}),
	);

	// apply some of our environment variables to the app locals so that they can be used in the templates
	app.locals.env = {
		stripe: config.STRIPE.PUBLISHABLE_KEY,
		paypal: config.PAYPAL.CLIENT_ID,
		facebook: config.FB_APP_ID,
		google: config.G_CLIENT_ID,
		captcha: config.GOOGLE_CAPTCHA_KEY,
	};

	app.use((req, res, next) => {
		// TODO: assign agency to locals if there's one present in the request
		if (req.session.user) {
			res.locals.user = req.session.user;
		}

		next();
	});

	app.use((req, res, next) => {
		const ignoredRequests = [
			'png',
			'jpg',
			'js',
			'svg',
			'jpeg',
			'woff',
			'ttf',
			'css',
			'ico',
			'map',
			'gif',
		];

		const parts = req.originalUrl.split('.');

		if (req.originalUrl !== '/health' && !ignoredRequests.includes(parts[parts.length - 1])) {
			const clientIp = req.ip;

			const logString = `[${res.statusCode}] ${req.method} ${clientIp} (${
				req.session?.user ? `USER ${req.session.user._id}` : 'GUEST'
			}) path: ${req.originalUrl}`;

			logger.info(logString);
		}

		next();
	});

	app.use(
		express.json({
			verify(req: Request, _res: Response, buffer: Buffer) {
				const url = req.originalUrl;
				if (url.startsWith('/payment')) {
					req.rawBody = buffer.toString();
				}
			},
		}),
	);

	app.use(
		express.urlencoded({
			extended: true,
		}),
	);

	// sanitize input data for mongo
	// replace with _ so that we cannot write it to db
	app.use(
		mongoSanitize({
			replaceWith: '_',
		}),
	);

	app.use(cookieParser());

	app.use('/', routes);
	app.use('/api', apiRoutes);

	if (config.NODE_ENV !== 'production') {
		app.use('/theme', (_req, res) => {
			res.render('theme/master.pug');
		});
	}

	app.use('/robots.txt', limiter, (_req, res, _next) => {
		res.type('text/plain');
		return res.sendFile(path.join(__dirname, '../public/robots.txt'));
	});

	app.use('/health', (_req, res, _next) => {
		return res.status(200).json({ status: 'ok' });
	});

	if (config.MAINTENANCE_ENABLED) {
		app.get('*', (_req, res) => {
			return res.status(200).render('maintenance');
		});
	}

	// ERROR PAGE
	app.get('*', (_req, res) => {
		return res.status(404).render('error/404');
	});

	// error handler
	app.use((err, req, res, _next) => {
		// set locals, only providing error in development
		res.locals.message = err.message;
		res.locals.error = req.app.get('env') === 'development' ? err : {};

		logger.error(err);

		return res.status(500).render('error/500');
	});

	app.listen(config.PORT, () => {
		logger.info(`App listening on port ${config.PORT}`);
	});
})();

process.on('uncaughtException', (err) => {
	logger.error(err);
});

export default app;
