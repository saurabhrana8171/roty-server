const helper = {};
var d = new Date();
var moment = require('moment');
var moment1 = require('moment-timezone');
var path = require('path');
var jwt = require('jsonwebtoken');
// const chalk = require('chalk');
// const aws = require('aws-sdk');
// const multer = require('multer');
// const multerS3 = require('multer-s3');


// helper.upload_space = function (filepath) {

// 	const spacesEndpoint = new aws.Endpoint('sgp1.digitaloceanspaces.com');
// 	const s3 = new aws.S3({
// 		endpoint: spacesEndpoint,
// 		accessKeyId: 'RI3SH6NRY345ZF4PDM5L',
// 		secretAccessKey: 'qkISEYWNA2jOe+RothynK7Wsiw+zaTfL80+lPvteKl8'
// 	});

// 	// const upload = multer({
// 	// 	storage: multerS3({
// 	// 		s3: s3,
// 	// 		bucket: 'bhagya-milan/bhagya-milan-dev/' + filepath,
// 	// 		acl: 'public-read',
// 	// 		key: function (request, file, cb) {
// 	// 			//console.log("file--->>>", file);
// 	// 			let extArray = file.mimetype.split("/");
// 	// 			let extension = extArray[extArray.length - 1];
// 	// 			var fileExt = path.extname(file.originalname);
// 	// 			var fileName = file.originalname;
// 	// 			fileName = fileName.split(".");
// 	// 			fileName = fileName[0];
// 	// 			//fileName.splice(-1, 1);
// 	// 			//fileName.join('');
// 	// 			fileName = fileName.replace(" ", "-");
// 	// 			fileName = fileName + '-' + new Date().getTime();
// 	// 			var data = fileName + fileExt;
// 	// 			cb(null, data);
// 	// 		}
// 	// 	})
// 	// })
// 	return upload;
// };

helper.pagination = (items, page, per_page) => {

	var page = page || 1,
		per_page = per_page || 10,
		offset = (page - 1) * per_page,
		total_pages = Math.ceil(items / per_page);
	return {
		page: page,
		per_page: per_page,
		pre_page: page - 1 ? page - 1 : null,
		next_page: (total_pages > page) ? page + 1 : null,
		total: items,
		total_pages: total_pages
	};

};
helper.response = function (response, status_code, message, data) {
	//console.log('------SENDING RESPONSE------', data)
	//console.log('------RESPONSE MESSAGE', message)
	var ret = {
		code: status_code,
		message: message,
	};
	if (data) {
		Object.assign(ret, data);
	}
	response.status(status_code).json(ret);
};

helper.sendMail = (emailFrom, emailTo, subject, mailMessage, filename, filePath) => {
	return new Promise(function (resolve, reject) {
		var mainOptions = {
			from: emailFrom,
			to: emailTo,
			subject: subject,
			html: mailMessage
		};
		if (filename != "") {
			mainOptions.attachments = [{
				// file on disk as an attachment
				filename: filename,
				path: filePath // stream this file
			}]
		}
		//console.log(mainOptions);
		transporter.sendMail(mainOptions, function (err, info) {
			if (err) {
				console.log("transporter.sendMail >>> ", err);
			} else {
				resolve(1);
			}
		});
	});
};

helper.cleanArray = (arr1) => {
	var arr = JSON.parse(JSON.stringify(arr1));
	//console.log(Array.isArray(arr));
	if (arr instanceof Array === false) {
		Object.keys(arr).forEach(function (key) {
			if (arr[key] == null) {
				arr[key] = '';
			}
		});
	} else if (arr instanceof Array) {
		arr.map(function (e) {
			//console.log(e)
			//return (e != null) ? e : "";
			Object.keys(e).forEach(function (key) {
				if (e[key] == null) {
					e[key] = '';
				}
			});
		});
	}
	return arr;
};
helper.generate_jwt = (userId) => {
	var token = jwt.sign({ id: userId }, Config.jwt_secret, {
		expiresIn: '30d'
	});
	return token;
};

helper.date = () => {

	var lastActive = new Date();
	lastActive.setHours(lastActive.getHours() + 5);
	lastActive.setMinutes(lastActive.getMinutes() + 30)
	return lastActive

};

helper.get_sql_date = () => {
	return moment().format('YYYY-MM-DD HH:mm:ss');
};

helper.get_sql_current_date = () => {
	return moment().format('YYYY-MM-DD');
};

helper.get_sql_date_timezone = (timezone) => {
	return moment1().tz(timezone).format('YYYY-MM-DD');
};

helper.get_sql_date2 = () => {
	return moment().format('YYYY-MM-DD HH:mm:ss');
};

helper.generate_otp = () => {
	return Math.floor(1000 + Math.random() * 900000);
};

helper.ucfirst = (str) => {
	return str.charAt(0).toUpperCase() + str.slice(1)
};

helper.format_sql_data = (data) => {
	return JSON.parse(JSON.stringify(data));
};

helper.generate_url = (req) => {
	return req.protocol + '://' + req.hostname + ':' + req.connection.localPort;
};

helper.console = (type, output) => {
	let has_str = "-----------------------------------";
	if (type == null) {
		if (typeof output == 'object') {
			console.log(chalk.blue.bold.inverse(has_str));
			console.log(output);
			console.log(chalk.blue.bold.inverse(has_str));
		} else {
			console.log(chalk.blue.bold.inverse(output));
		}
	} else if (type == true) {
		if (typeof output == 'object') {
			console.log(chalk.green.bold.inverse(has_str));
			console.log(output);
			console.log(chalk.green.bold.inverse(has_str));
		} else {
			console.log(chalk.green.bold.inverse(output));
		}
	} else {
		if (typeof output == 'object') {
			console.log(chalk.red.bold.inverse(has_str));
			console.log(output);
			console.log(chalk.red.bold.inverse(has_str));
		} else {
			console.log(chalk.red.bold.inverse(output));
		}
	}
};






module.exports = helper;