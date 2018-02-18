// Env variables
require('dotenv').config();


// Library consts
let express    = require('express');
let mysql      = require('mysql');
let path       = require('path');
let bodyParser = require('body-parser');
let fs         = require('fs');
let http       = require('http');
let knex       = require('knex');


// App creation
let app = express();


// DB setup
let knexConfig = require('./knexfile.js');
let db = knex(knexConfig);


// Using
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.disable('x-powered-by');


// Useful consts
const ALLOWED_TYPES = {
  mention : true,
};

const ALLOWED_STATUS = {
  unread : true,
  read   : true,
  hidden : true,
};

const DOMAIN_WHITELIST = {
  'localhost:3002'            : 'localhost:3002',
  'a1c30486.ngrok.io'         : 'https://go.tradegecko.com',
  'https://go.tradegecko.com' : 'https://go.tradegecko.com',
}

// Routes
app.all(/^\/ajax\/*/,
  (req, res, next) => {
    res.header('Content-Type', 'application/json');

    //if (DOMAIN_WHITELIST[req.get('host')]) {
      //res.header('Access-Control-Allow-Origin',  DOMAIN_WHITELIST[req.get('host')]); //req.get('host'));
      res.header('Access-Control-Allow-Origin',  '*'); //req.get('host'));
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Request-URL, X-Pusher-Socket');
      res.header('Access-Control-Allow-Methods', 'POST,GET,PATCH,DELETE');
    //}

    next();
  });

app.get('/',
  (req, res, next) => {
    res
      .status(200)
      .send(`
        <h1>Hi!</h1>
        <script src='https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js'></script>
      `);
  });

app.post('/ajax/notification',
  (req, res, next) => {
    let { type, recipients, data } = req.body;
    let results  = [];
    let errors   = [];
    let actions  = [];
    let promises = [];

    if (!data) {
      errors.push(`'data' not provided.`);
    }

    if (!type) {
      errors.push(`'type' not provided.`);
    } else if (!ALLOWED_TYPES[type]) {
      errors.push(`Type '${ type }' does not exist.`);
    }

    if (errors.length === 0) {
      try {
        data       = JSON.stringify(JSON.parse(data));
        recipients = (recipients ? `${ recipients }`.split(',') : [])
          .map(recipient => +(recipient.trim()));

        let notification = {
          type,
          data,
          recipients : recipients.join(),
        };

        promises.push(
          db('notification').insert(notification)
          .then(data => actions.push(`Added ${ type } notification.`))
          .catch(err => errors.push(err))
        );
      } catch(err) {
        errors.push(err);
      }
    }

    resolveRoute(promises, res, errors, results, actions);
  });

app.get('/ajax/notification',
  (req, res, next) => {
    let results  = [];
    let errors   = [];
    let actions  = [];
    let promises = [];

    let request = db('notification')
      .select('id', 'created_at', 'updated_at', 'status', 'type', 'data')
      .whereNot({ status : 'hidden', })
      .then(notifications => {
        actions.push(`Retrieved notifications.`)
        results.push(...notifications.map(tidyNotification));
      });
    promises.push(request);

    resolveRoute(promises, res, errors, results, actions);
  });

app.patch('/ajax/notification/:id',
  (req, res, next) => {
    let { status } = req.body;
    let id = req.params.id;
    let results  = [];
    let errors   = [];
    let actions  = [];
    let promises = [];

    if (!id) {
      errors.push(`Notification 'id' not provided.`);
    }

    if (!status) {
      errors.push(`New 'status' not provided.`);
    }

    if (!ALLOWED_STATUS[status]) {
      errors.push(`Status '${ status }' does not exist. Use one of: '${ Object.keys(ALLOWED_STATUS).join("', '") }'.`);
    }

    if (errors.length === 0) {
      let request = db('notification')
        .where('id', id)
        .update({ status, })
        .then(notifications => {
          actions.push(`Updated notification ${ id }.`)
        })
        .catch(err => {
          errors.push(err);
        });
      promises.push(request);
    }

    resolveRoute(promises, res, errors, results, actions);
  });

app.delete('/ajax/notification/:id',
  (req, res, next) => {
    let id = req.params.id;
    let results  = [];
    let errors   = [];
    let actions  = [];
    let promises = [];

    if (!id) {
      errors.push(`Notification 'id' not provided.`);
    }

    if (errors.length === 0) {
      let request = db('notification')
        .where('id', id)
        .update({ status : 'hidden', })
        .then(notifications => {
          actions.push(`Hid notification ${ id }.`)
        })
        .catch(err => {
          errors.push(err);
        });
      promises.push(request);
    }

    resolveRoute(promises, res, errors, results, actions);
  });

app.options(/^\/ajax\/.*/,
  (req, res, next) => {
    res.status(204)
       .send();
  })

app.all(/^\/.*/,
  (req, res, next) => {
    res.status(404)
        .send('Page not found.');
  });


// Start the server
let port = parseInt(process.env.PORT || 3000);
app.set('port', port);
let server = http.createServer(app);

db.migrate.latest()
  .then(() => {
    server.listen(app.get('port'));
    console.log(`Listening on port: '${ app.get('port') }'.`);
  });


// Extra methods
function tidyNotification(notification) {
  if (notification.created_at) {
    notification.created_at = +new Date(notification.created_at);
  }

  if (notification.updated_at) {
    notification.updated_at = +new Date(notification.updated_at);
  }

  if (notification.data) {
    notification.data = JSON.parse(notification.data);
  }

  return notification;
}

function resolveRoute(promises, res, errors, results, actions) {
  Promise.all(promises)
    .catch(err => console.log(err))
    .then(() => {
      res
        .status(errors.length ? 400 : 200)
        .send({ errors, results, actions, })
    });
}
