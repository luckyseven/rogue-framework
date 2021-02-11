const express           = require('express');
const fs                = require('fs');
const path              = require('path');
const requireAll        = require('require-all');
const bodyParser        = require('body-parser');
const shell             = require('shelljs');
const RogueResponse     = require('./core/http/RogueResponse');
const RogueError        = require('./core/http/RogueError');

module.exports = class Rogue {
    constructor(config = null) {
        if (!config) {
            this.loadConfFromEnv();
        } else {
            this.config = config;
        }
      
        this.express    = express;
        this.expressApp = express();

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
        this.loadPolicies();
    }

    loadConfFromEnv() {
        this.config = require(this.getRootDir() + '/config/config.js');

        if (typeof process.env.NODE_ENV !== 'undefined') {
            const env = require(this.getRootDir() + '/config/config.' + process.env.NODE_ENV + '.js');

            const recursiveFunc = (conf, env) => {
                for (let key of Object.keys(env)) {

                    if (typeof conf[key] === 'undefined' || typeof conf[key] !== 'object') {
                        conf[key] = env[key];
                        continue;
                    }

                    recursiveFunc(conf[key], env[key]);
                }
            };

            recursiveFunc(this.config, env);
        }
    }

    loadControllers() {
        const controllersPath = path.join(this.getRootDir(), '/controllers');
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

    _getObjectFromPath(path, objectsArray) {
        const parts = path.split('/');
        let result = objectsArray[parts[0]];
        for (let i = 1, l = parts.length; i < l; i++) {
            result = result[parts[i]];
        }
        return result;
    }

    loadRoutes() {
        const routesPath = path.join(this.getRootDir(), '/routes');
        if (!fs.existsSync(routesPath))
            throw new Error("Directory 'routes' doesn't exists in the project root.");
        const routes = requireAll({
            dirname     :  routesPath
        });

        for (let route in this.config.routes) {
            this.expressApp.use(route, routes[this.config.routes[route]](this));
            if (!Array.isArray(this.config.routes[route])) {
                this.config.routes[route] = [this.config.routes[route]];
            }
            this.config.routes[route].forEach((router) => {
                let routerObj = this._getObjectFromPath(router, routes);
                try {
                    this.expressApp.use(route, routerObj(this));
                } catch (e) {
                    console.error('Router ' + router + ' doesn\'t exists and will not be loaded.');
                }
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

    loadPolicies() {
        const policiesPath = path.join(this.getRootDir(), '/policies');
        if (!fs.existsSync(policiesPath))
            throw new Error("Directory 'policies' doesn't exists in the project root.");
        this.policies = requireAll({
            dirname : policiesPath,
            resolve : policy => policy(this)
        });
    }

    getPolicies(controller, action) {
        if (this.config.modules && this.config.modules.policies) {
            if (!this.config.modules.policies.enabled)
                return [];

            if (typeof this.policies[controller] === 'undefined')
                return [];

            if (typeof this.policies[controller][action] === 'undefined')
                return [];

            return this.policies[controller][action];
        }
        return [];
    }

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

            req.data = typeof data !== "undefined" ? data : null;

            const controllerObj = this._getObjectFromPath(controller, this.controllers);

            try {
                const all = this.getPolicies(controller, action)
                for (const policy of all) {
                    policy(req, res, next);
                }
            } catch(resError) {
                return resError;
            }

            return controllerObj[action](req, res, next);
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

    loadConfFromEnv() {
        try {
            this.config = require(this.getRootDir() + '/config/config.js');
        } catch (e) {
            console.error('Required file /config/config.js not found.');
            process.exit();
        }

        if (typeof process.env.NODE_ENV !== 'undefined') {
            try {
                const env = require(this.getRootDir() + '/config/config.' + process.env.NODE_ENV + '.js');

                const configUpdater = (conf, env) => {
                    for (let key of Object.keys(env)) {

                        if (typeof conf[key] === 'undefined' || (typeof conf[key] !== 'object' || Array.isArray(conf[key]))) {
                            conf[key] = env[key];
                            continue;
                        }

                        configUpdater(conf[key], env[key]);
                    }
                };

                configUpdater(this.config, env);
            } catch (e) {
                console.warn('File config.' + process.env.NODE_ENV + '.js not found. Using config.js as default.');
            }


        }
    }
};
