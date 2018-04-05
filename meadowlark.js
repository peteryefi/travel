var express = require('express');

var app = express();

var bodyParser = require('body-parser');

var formidable = require('formidable');

var jqupload = require('jquery-file-upload-middleware');

var credentials = require('./credentials.js');

var connect = require('connect');

app.use(connect.compress);

app.use(require('cookie-parser')(credentials.cookieSecret));

app.use(require('express-session')());

//set up handlebars view engine
var handlebars = require('express3-handlebars').create({
		defaultLayout:'main',
		helpers:{
			section: function(name, options){
				if(!this._sections){
					this._sections = {};	
				}

				this._sections[name] = options.fn(this);
				return null;
			}
		}
	});

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);


//set directory for static files
app.use(express.static(__dirname + '/public'));

//use body parser to process forms
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

//defining route parameters for testing
app.use(function(req, res, next){
	res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
	next();
});

app.use(function(req, res, next){
	res.locals.flash = req.session.flash;
	delete req.session.flash;
	next();
});


function getWeatherData(){
 	return {
 		locations: [
 			{
 				name: 'Portland',
 				forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
 				iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
 				weather: 'Overcast',
 				temp: '54.1 F (12.3 C)',
 			},
 			{
 				name: 'Bend',
 				forecastUrl: 'http://www.wunderground.com/US/OR/Bend.html',
 				iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
 				weather: 'Partly Cloudy',
 				temp: '55.0 F (12.8 C)',
 			},
 			{
 				name: 'Manzanita',
 				forecastUrl: 'http://www.wunderground.com/US/OR/Manzanita.html',
 				iconUrl: 'http://icons-ak.wxug.com/i/c/k/rain.gif',
 				weather: 'Light Rain',
 				temp: '55.0 F (12.8 C)',
 			},
 		],
 	};
}

app.use(function(req, res, next){
	if(!res.locals.partials){
		res.locals.partials = {};
		res.locals.partials.weather = getWeatherData();
		next();
	}
})

//require fortune script
var fortune = require('./lib/fortune.js');

app.get('/', function(req, res){
	res.render('home');
});



app.get('/about', function(req, res){
	
	res.render('about', {
		fortune: fortune.getFortune(),
		pageTestScript: '/qa/tests-about.js'
	});
});

app.get('/jquery-test', function(req, res){
	res.render('jquery-test');
});

app.get('/tours/hood-river', function(req, res){
	res.render('tours/hood-river');
});

app.get('/tours/request-group-rate', function(req, res){
	res.render('tours/request-group-rate');
});

app.get('/tours/oregon-coast', function(req, res){
	res.render('tours/oregon-coast');
});


app.get('/nursery-rhyme', function(req, res){
	res.render('nursery-rhymes');
});

app.get('/data/nursery-rhyme', function(req, res){
	res.json({
		animal: 'squirrel',
		bodyPart: 'tail',
		adjective: 'bushy',
		noun: 'heck',
	});
});

app.get('/newsletter', function(req, res){
	
	res.render('newsletters', {csrf: 'CSRF token goes here'});
});

app.post('/process', function(req, res){
	var name = req.body.name || '',
		email = req.body.email || '';

		if(!email.match(VALID_EMAIL_REGEX)){
			if(req.xhr)
				return res.json({error: 'Invalid email address'});

			req.session.flash = {
				type: 'danger',
				intro: 'Validation error!',
				message: 'The email address you entered was not valid',
			}

			return res.redirect(303, '/newsletter/archive')
		}

		new NewsletterSignup({name: name, email:email}).save(function(err){
			if(err){
				if(req.xhr) 
					return res.json({error: 'Database error'});

				req.session.flash = {
					type: 'danger',
					intro: 'Database error!',
					message: 'There was a database error. Please try again later'
				}
				res.redirect(303, '/newsletters/archive')
			}

			if(req.xhr)
				return res.json({success:true});

			req.session.flash = {
				type: 'success',
				intro: 'Thank you!',
				message: 'Thank you now you have been signed up for the newsletter'
			};
			res.redirect('/newsletters/archive')
		});
 	
});

app.get('/contest/vacation-photo', function(req, res){
	var now = new Date();
	res.render('contest/vacation-photo',{
		year: now.getFullYear(),
		month: now.getMonth()
	});
});

app.post('/contest/vacation-photo/:year/:month', function(req, res){
	var form = new formidable.IncomingForm();
	form.parse(req, function(err, fields, files){
		if(err)
			return res.redirect(303, '/errors');

		console.log('received fields');
		console.log(fields);
		console.log('received files');
		console.log(files);
		res.redirect(303, '/thank-you');
	});
});

app.get('/thank-you', function(req, res){
	res.cookie('test', 'Testing', {signed: true});
	res.render('thank-you');
});

app.use('/upload', function(req, res, next){
	var now = Date.now();
	jqupload.fileHandler({
		uploadDir: function(){
			return __dirname + '/public/uploads/' + now;
		},
		uploadUrl: function(){
			return '/uploads/' + now;
		},
	})(req, res, next);
});


//use cart validation as a middleware
var cartValidation = require('./lib/cartValidation.js');
app.use(cartValidation.checkWaivers);
app.use(cartValidation.checkGuestCounts);

//custom 404 page
app.use(function(req, res){
	res.status(404);
	res.render('404');
});

//custom 500 page
app.use(function(err, req, res, next){
	console.error(err.stack);
	
	res.status(500);
	res.render('500');
});


app.listen(app.get('port'), function(){
	console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate');
});