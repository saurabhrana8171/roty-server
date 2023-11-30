
const express = require('express');
const app = express();
const ejs = require('ejs');
const morgan = require('morgan');
const cors = require('cors')
const mongoose = require('mongoose');
var path = require('path')
const NODE_ENV = process.env.NODE_ENV || "production";
require('dotenv').config({ path: '.env.' + NODE_ENV });
const PORT = process.env.PORT
app.use(cors());
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'https://rotyseven.com');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});
app.use(express.urlencoded({ extended: false }));



app.set('view engine','ejs'); 
app.engine('ejs', require('ejs').__express);
app.set('views', path.join(__dirname, './views'));




//import Routes
const userRoutes = require('./routes/User/UserRoutes');
app.use(express.json());
app.use('/v1', userRoutes);

app.use(express.static(path.join(__dirname, '/public')));


//middleware
app.use(morgan('dev'));

//connecting database
mongoose.connect(process.env.DATABASE, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
});

mongoose.connection.on('connected', () => {
    console.log("database connected")
});

//(error handling ) when errors will be occur
mongoose.connection.on('error', (err) => {
    console.log("err connecting", err)
});



app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
    if (req.method == 'OPTIONS') {
        res.status(200).end();
    } else {
        next();
    }
});






//callig server
app.listen(PORT, () => {
    console.log("server is running on", PORT)
});

