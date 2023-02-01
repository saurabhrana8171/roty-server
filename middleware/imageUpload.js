
//impementing middleware using jwt only those user can access who have tocken
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const User = require('../models/UserModel')
const Helper = require('../config/helper');
require('dotenv').config();
const multer = require('multer')

 const storage =  multer.diskStorage({
            distination:function(req,file,cb){
                cb(null,'../upload')
            },
            filename:function(req,file,cb){
                cb(null,Date.now() + file.originalname)
            }
        })

        const upload = multer({storage:storage})
      

module.exports =  {
   
        upload 
}


