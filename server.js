const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const multiparty = require('connect-multiparty');
const session = require('express-session');
const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectId;

const MONGODB_URI = 'mongodb://localhost:27017/jedi';

app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({
	secret: 'jedi',
	resave: false,
	saveUninitialized: false
}));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.get('/', (req, res) => {
	if (req.session.user) {
		mongoClient.connect(MONGODB_URI, (err, db) => {
			const usuarios = db.collection('usuarios');
			usuarios.find({'_id': new ObjectId(req.session.user.id)}).toArray((err, docs) => {
				db.close();
				res.render('home', {
					nome: docs[0].nome,
					imagem: `images/profile/${docs[0]._id}.jpg`
				});
			});
		});
	} else {
		res.render('cadastro-login');
	}
});

app.post('/login', (req, res) => {
	const email = req.body.email;
	const senha = req.body.senha;

	mongoClient.connect(MONGODB_URI, (err, db) => {
		const usuarios = db.collection('usuarios');
		usuarios.find({
			'email': email,
			'senha': senha
		}).toArray((err, docs) => {
			if (docs.length === 0) {
				res.render('home', {nome: 'Usuário não cadastrado'});	
			} else {
				req.session.user = {id: docs[0]._id};
				res.redirect('/');				
			}

			db.close();
		});
	});
});

app.get('/logout', (req, res) => {
	delete req.session.user;
	res.redirect('/');
});

app.post('/cadastrar', multiparty(), (req, res) => {
	mongoClient.connect(MONGODB_URI, (err, db) => {
		const usuarios = db.collection('usuarios');

		const usuario = req.body;
		usuario.posts = [];

		usuarios.insertOne(usuario, (err, result) => {
			db.close();

			req.session.user = {id: result.ops[0]._id};

			fs.readFile(req.files.foto.path, (err, data) => {
				fs.writeFile(path.join(__dirname, `public/images/profile/${req.session.user.id}.jpg`), data);
			});

			res.redirect('/');
		});
	});
});

app.post('/postagens', (req, res) => {
	mongoClient.connect(MONGODB_URI, (err, db) => {
		const usuarios = db.collection('usuarios');
		usuarios.find({'_id': new ObjectId(req.session.user.id)}).toArray((err, docs) => {
			const posts = docs[0].posts;
			const post = {
				texto: req.body.texto,
				data: new Date()
			};

			posts.unshift(post);

			usuarios.updateOne({'_id': new ObjectId(docs[0]._id)},
			{$set: {'posts': posts}}, (err, results) => {
				db.close();

				res.json(post);
			});
		});
	});
});

app.get('/postagens', (req, res) => {
	if (req.session.user) {
		mongoClient.connect(MONGODB_URI, (err, db) => {
			const usuarios = db.collection('usuarios');
			usuarios.find({'_id': new ObjectId(req.session.user.id)}).toArray((err, docs) => {
				db.close();

				res.json(docs[0].posts);
			});
		});
	} else {
		res.json([]);
	}
});

app.get('/pessoas', (req, res) => {
	if (req.session.user) {
		mongoClient.connect(MONGODB_URI, (err, db) => {
			const usuarios = db.collection('usuarios');
			usuarios.find({}).toArray((err, docs) => {
				db.close();

				res.json(docs);
			});
		});
	} else {
		res.json([]);
	}
});

app.listen(3000, () => console.log('Aplicação escutando na porta 3000!'));