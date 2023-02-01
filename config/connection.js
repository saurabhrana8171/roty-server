const NODE_ENV = process.env.NODE_ENV || "production"
const dotenv = require('dotenv');
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });
const mongoose =  require('mongoose');
const log = console.log;
global.Promise = mongoose.Promise;
var againConnect = ()=>{
    setInterval(()=>{
        db_connect();
    },1000)
}
function db_connect(){
    mongoose.connection.openUri(process.env.DATABASE_URL, {useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true });
};
db_connect();
mongoose.connection.on('connected', () =>{ 
    clearInterval(againConnect);
    log(`DB connected`);
});
mongoose.connection.on('error', (error) => {
    log(`Error in DB connetcion is ${error}`);
});
mongoose.connection.on('disconnected', () => {
    againConnect();
})