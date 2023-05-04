const fs = require("fs");
const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');

const app = express();
const local = __dirname;
const image = fs.readFileSync(local + '\\1.png').toString('base64');
const port = 8080;

app.use(express.static(local));
app.use(bodyParser.urlencoded({limit: '10mb'}));

app.post('/test', function (req, res) {
    const client = req.body.data.split('\n');
    let response = {
        status: true
    };

    new Promise(resolve => {
        request('https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=' +
            client[0].trim() + '&client_secret=' + client[1].trim(), (error, res, data) => {
            if (!error && res.statusCode == 200) {
                response.token = JSON.parse(data).access_token;
            }
            else {
                response.status = false;
                response.errorMessage = JSON.parse(data).error_description;
            }
            resolve();
        });
    }).then(() => {
        return new Promise(resolve => {
            if (response.status) {
                response.templateSign = (client[2] !== undefined ? client[2].trim() : '');
                request.post({
                    url: 'https://aip.baidubce.com/rest/2.0/solution/v1/iocr/recognise/finance?access_token=' + response.token,
                    form: {
                        image: image,
                        templateSign: response.templateSign
                    }
                }, (err, res, body) => {
                    const result = JSON.parse(body);
                    if (result.error_code !== 272000) {
                        response.status = false;
                        response.errorMessage = result.error_msg;
                    }
                    resolve();
                });
            }
            else {
                resolve();
            }
        })
    }).then(() => {
        res.send(JSON.stringify(response));
    });
});

app.post('/iOCR', function (req, res) {
    new Promise(resolve => {
        request.post({
            url: 'https://aip.baidubce.com/rest/2.0/solution/v1/iocr/recognise/finance?access_token=' + req.body.token,
            form: {
                image: req.body.image,
                templateSign: req.body.templateSign
            }
        }, (err, res, body) => {
            resolve(body);
        })
    }).then(value => {
        res.send(value);
    })
});

app.use(function (req, res, next) {
    res.status(404).send('Sorry can\'t find that!')
});

app.listen(port);
console.log('Server running at port ' + port);
