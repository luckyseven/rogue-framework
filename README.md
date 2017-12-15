# Rogue Framework

Fast and reliable web development with [node](http://nodejs.org).

## Why Rogue?
Rogue is a module-based framework for Node that offers the fastest way to develop professional web applications. Based on [Express](http://expressjs.com/) and [Mongoose](http://mongoosejs.com/), has also a lot of other integrations. Thanks to [rogue-framework-cli](https://github.com/luckyseven/rogue-framework-cli) you can start to develop your applications in zero-time, focusing your energy only on business logic on the powerful structure of Rogue.

```js
const config = require('./config/config.js');
const Rogue  = require('rogue-framework');

const app = new Rogue(config);

app.listen(config.main.port, () => {
    console.log(`Rogue Framework is listening on port ${config.main.port}`)
});
```

## Installation
There are two ways to use Rogue.
### Using the CLI (recommended)
The first step is to install the [rogue-framework-cli](https://github.com/luckyseven/rogue-framework-cli) globally in your system with `npm install`:
```bash
$ npm install -g rogue-framework-cli
```
Then, create a directory for your new project and run `npm init`:

```bash
$ mkdir my-project
$ cd my-project

$ npm init
```
Use `rogue init` to create a brand new Rogue project:

```bash
$ rogue init
```
Now you can start your web application with `node index.js`. Visit [http://localhost:4000/api/v1/hello](http://localhost:4000/api/v1/hello) and check if it works.
### Install as module
You can also install Rogue without the CLI helper:
```bash
$ npm install rogue-framework
```
Then, you need to create the directory structure manually.

## Rogue directories structure

With Rogue you can create very-well structured applications that could be easily maintained in the long term.
* `/config`: this folder doesn't need explainations. Here you can put your configuration files. The default configuration file for Rogue is `config.js`.
* `/controllers`: Rogue actions live inside controllers file. These files will be auto-loaded by the framework and you can use them to declare _routes_ for your applications.
* `/routes`: Use these files to declare your applications' routes. Routes will be auto-loaded by Rogue so you don't need to worry about the import.
* `/modules`: Rogue's core is made of modules. You can add **new modules** or **overwrite** the existing ones. Also modules will be auto-loaded by Rogue.
* `/schemas`: This directory is used by the `mongoose` module and contains the _schemas_ that you will use in your applications. If the `mongoose` modules is active, these files will be auto-loaded by Rogue (and transformed in models).

Everything in Rogue will be globally available in the applications. Use the power of JavaScript and NodeJS to add all the features that you need.

## Module system
Rogue has it's own module system. In the initial structure you will find:
* `mongoose`: the Mongoose module.
* `logger`: a logger module based on [multer](https://www.npmjs.com/package/multer).
* _More modules are coming soon... this is an alpha version_ ;-)

You can create custom modules in the `/modules` directory of your project using this structure:
```js
module.exports = (rogue, config) => {
    console.log("Hi! I'm a custom Rogue module!")
};
```
The `rogue` parameter give you the access to the data (controllers, modules, configurations...) loaded by Rogue, so you can interact with everything inside your custom module. The `config` parameter give you a fast access to the configuration for this module (see next paragraph).

## Configuration
The standard configuration file for Rogue is `config/config.js`. There are both mandatory and optional fields:
```js
module.exports = {
    main: { // Mandatory
        port    : 4000, // Mandatory
        debug   : false, // Mandatory
    },
    routes: { // Mandatory
        '/api/v1' : 'default',
    },
    modules : { // Mandatory
        logger: { // Optional
            enabled: true,
            format: 'dev',
            filename: 'access.log',
            interval: '1d'
        },
        mongoose: { // Optional
            enabled      : false,
            host         : 'localhost',
            db_name      : 'rogue_sample',
            credentials  : false
            /* If your MongoDB server uses credentials you can specify them this way:
             credentials         : { username: 'your_username', password: 'your_password' }
             */
        }
    }
    /* You can add here any custom parameter. */
};

```
* `main` contains basic informations about your applications, like the number of `port` to listen to and the `debug` status. Mandatory.
* `routes` contains the list of basic routes assigned to a router file (in the example the `/api/v1` route is associated to the `routes/default.js` file. Every route inside this file will be prefixed by `/api/v1`).
* `modules` could also be an empty object, so everything inside it is optional. When you create a configuration for a module, it will be auto-loaded by Rogue. The module key must coincide with the file name (ex. if exists the `mongoose` key in `modules` configuration, Rogue will try to load the `mongoose.js` file first from the `/modules` directory in your project and then from the `/modules` directory from Rogue module). Every module could have a different configuration, based on it's behavior. See the specific docs for every module for more informations.

## The main file
You can launch a ready-to-use Rogue application with few code lines:
```js
const config = require('./config/config.js'); //The config file
const Rogue  = require('rogue-framework');

const app = new Rogue(config);

app.listen(config.main.port, () => {
    console.log(`Rogue Framework is listening on port ${config.main.port}`)
});
```
## Philosophy
Rogue was born to provide the fastest way to build a modern web application with a reliable (and reusable) structure. The developer should only focus on the business logic, leaving everything related to the structure to Rogue. Speed up your work!

## Have you used this plugin in your project?

Say hello with a [tweet](https://twitter.com/luckysevenrox)!

## License

> MIT License - Copyright (c) 2017 Alberto Fecchi

Full license [here](LICENSE)