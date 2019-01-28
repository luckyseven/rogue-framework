const express           = require('express');
const fs                = require('fs');
const path              = require('path');
const requireAll        = require('require-all');
const bodyParser        = require('body-parser');
const shell             = require('shelljs');
const glob              = require('glob');
const RogueResponse     = require('./core/http/RogueResponse');
const RogueError        = require('./core/http/RogueError');
module.exports = class Rogue {
    constructor(config) {
        this.express    = express;
        this.expressApp = express();

        if (!config) {
            this.loadConfFromEnv();
        } else {
            this.config = config;
        }

        // todo: should be moved
        if (Array.isArray(this.config.folders) && this.config.folders.length) {
            let folders = this.config.folders.map(folder => path.join(this.getRootDir(), folder));
            shell.mkdir('-p', folders);
        }

        // todo: should be moved
        if (this.config.bodyParser.type !== '') {
            switch (this.config.bodyParser.type) {
                case 'json':
                    this.expressApp.use(bodyParser.json(this.config.bodyParser.options));
                    break;
                case 'raw':
                    this.expressApp.use(bodyParser.raw(this.config.bodyParser.options));
                    break;
                case 'text':
                    this.expressApp.use(bodyParser.text(this.config.bodyParser.options));
                    break;
                case 'url':
                    this.expressApp.use(bodyParser.urlencoded(this.config.bodyParser.options));
                    break;
            }
        } else {
            this.expressApp.use(bodyParser.json());
        }

        this.loadUtils();
        this.loadModules();
        this.loadControllers();
        this.loadRoutes();
    }

    loadConfFromEnv() {
        this.config = require(this.getRootDir() + '/config/config.js');

        if (typeof process.env.NODE_ENV !== 'undefined') {
            try {
                const env = require(this.getRootDir() + '/config/config.' + process.env.NODE_ENV + '.js');

                const importValues = (conf, env) => {
                    for (let key of Object.keys(env)) {

                        if (typeof conf[key] === 'undefined' || typeof conf[key] !== 'object') {
                            conf[key] = env[key];
                            continue;
                        }

                        importValues(conf[key], env[key]);
                    }
                };

                importValues(this.config, env);
            } catch (err) {}
        }
    }

    loadControllers() {
        const controllersPath = path.join(this.getRootDir(), '/controllers');

        glob.sync( controllersPath + '/**/*.js' ).forEach( function( file ) {
            require( path.resolve( file ) );
        });

        if (!fs.existsSync(controllersPath))
            throw new Error("Directory 'controllers' doesn't exists in the project root.");
        this.controllers = requireAll({
            dirname : controllersPath,
            resolve : controller => controller(this)
        });
    }

    loadModules() {
        for (let module in this.config.modules) {
            if (this.config.modules[module].enabled) {
                let modulePath = '/modules/' + module + '.js';
                if (fs.existsSync(path.join(__dirname, modulePath))) {
                    require(path.join(__dirname, modulePath))(this, this.config.modules[module]);
                } else if (fs.existsSync(path.join(this.getRootDir(), modulePath))) {
                    require(path.join(this.getRootDir(), modulePath))(this, this.config.modules[module]);
                }
            }
        }
    }

    loadRoutes() {
        const routesPath = path.join(this.getRootDir(), '/routes');
        if (!fs.existsSync(routesPath))
            throw new Error("Directory 'routes' doesn't exists in the project root.");
        const routes = requireAll({
            dirname     :  routesPath
        });
        for (let route in this.config.routes) {
            if (!Array.isArray(this.config.routes[route])) {
                this.config.routes[route] = [this.config.routes[route]];
            }
            this.config.routes[route].forEach((router) => {
                this.expressApp.use(route, routes[router](this));
            });
        }
    }

    loadUtils() {
        const utilsPath = path.join(this.getRootDir(), '/utils');
        if (!fs.existsSync(utilsPath))
            throw new Error("Directory 'utils' doesn't exists in the project root.");
        this.utils = requireAll({
            dirname : utilsPath,
            resolve : util => util(this)
        });
    }

    // action(controller, action) {
    //     return this.controllers[controller][action];
    // }

    action(controller, action, data) {
        return (req, res, next) => {
            res.complete = (response, status) => {
                if (!(response instanceof RogueResponse)) {
                    response = new RogueResponse(response, status);
                }
                response.complete(res);
            };
            res.error = (error, status) => {
                if (!(error instanceof RogueError)) {
                    error = new RogueError(error, status);
                }
                error.complete(res);
            };

            req._data = typeof data !== "undefined" ? data : null;

            return this.controllers[controller][action](req, res, next);
        }
    }

    asyncAction(controller, action, data) {
        return (req, res, next) => {
            Promise.resolve(this.action(controller, action, data)(req, res, next))
                .catch(next);
        };
    }

    getRootDir() {
        return path.dirname(require.main.filename || process.mainModule.filename);
    }

    listen(port, callback) {
        return this.expressApp.listen.apply(this.expressApp, arguments);
    }
};