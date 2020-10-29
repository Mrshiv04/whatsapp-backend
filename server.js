import express from 'express';
import mongoose from 'mongoose';
import Messages from './dbMessages.js';
import Pusher from 'pusher';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 9000;

const pusher = new Pusher({
	appId: '1097875',
	key: 'c72a197dd424cf0f8be3',
	secret: '2298d6bca6b9d9840514',
	cluster: 'ap2',
	useTLS: true,
});

app.use(express.json());

app.use(cors());

// app.use((req, res, next) => {
// 	res.setHeader('Access-Control-Allow-Origin', '*');
// 	res.setHeader('Access-Control-Allow-Headers', '*');
// 	next();
// });

const connection_url =
	'mongodb+srv://admin:admin@cluster0.3620n.mongodb.net/whatsappdb?retryWrites=true&w=majority';

mongoose.connect(connection_url, {
	useCreateIndex: true,
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

const db = mongoose.connection;

db.once('open', () => {
	console.log('db connected');
	const msgCollection = db.collection('messagecontents');
	const changeStream = msgCollection.watch();
	changeStream.on('change', (change) => {
		console.log(change);
		if (change.operationType === 'insert') {
			const messageDetails = change.fullDocument;
			pusher.trigger('messages', 'inserted', {
				name: messageDetails.name,
				message: messageDetails.message,
				timestamp: messageDetails.timestamp,
				received: messageDetails.received,
			});
		} else {
			console.log('error triggering pusher');
		}
	});
});

app.get('/', (req, res) => res.status(200).send('hello world'));

app.get('/messages/sync', (req, res) => {
	Messages.find((err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			res.status(200).send(data);
		}
	});
});

app.post('/messages/new', (req, res) => {
	const dbMessage = req.body;
	Messages.create(dbMessage, (err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			res.status(200).send(data);
		}
	});
});

app.listen(port, () => console.log(`Listening on port number ${port}`));
