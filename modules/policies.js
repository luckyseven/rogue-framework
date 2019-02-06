const fs = require('fs');
const path = require('path');
const multer = require('multer');
const requireAll = require('require-all');

const storage = (data) => multer.diskStorage({
    destination: function(req, file, callback) {
        callback(null, data.find(d => d.name === file.fieldname).folder);
    },
    filename: function(req, file, callback) {
        const name =
            file.fieldname +
            (typeof req.jwt_payload !== 'undefined' ? '_' + req.jwt_payload.user_id : '') +
            '_' + Date.now() +
            path.extname(file.originalname);

        if (typeof req.body[file.fieldname] === 'undefined') {
            req.body[file.fieldname] = name;
        } else {
            req.body[file.fieldname] = !Array.isArray(req.body[file.fieldname])
                ? [name, req.body[file.fieldname]]
                : [name, ...req.body[file.fieldname]]
            ;
        }
        callback(null, name);
    }
});

module.exports = async (rogue, config) => {
    if (config.enabled) {
        const loopReq = (req, data) => {
            for (let d of data) {
                if (typeof req[d] === 'undefined')
                    return d;
            }
            return false;
        };
        const checkAllowed = (body, fields) => {
            let ris = {};
            for (let b in body)
                if (fields.indexOf(b) > -1)
                    ris[b] = body[b];
            return ris;
        };
        const castToBoolean = (variable) => {
            switch (typeof variable) {
                case 'boolean':
                    return variable;
                case 'number':
                    return Boolean(variable);
                case 'string':
                    variable = variable.toLowerCase().trim();

                    if (Number(variable))
                        return castToBoolean(Number(variable));

                    return variable === 'true';
                default:
                    return false;
            }
        };
        const fileFilter = data => (req, file, callback) => {
            const ext = path.extname(file.originalname);

            const type = data.find(d => d.name === file.fieldname).type;

            // switch (type) {
            //     case 'image':
            //         if (ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg')
            //             return callback('only images are allowed', null);
            //         break;
            //     case 'video':
            //         if (ext !== '.mp4')
            //             return callback('only mp4 videos are allowed', null);
            //         break;
            //     default:
            //         return callback(`${type} file is not allowed here`, null);
            // }
            callback(null, true);
        };
        const createFolder = (folder) => {
            try {
                fs.mkdirSync(folder)
            } catch (err) {
                if (err.code !== 'EEXIST') throw err
            }
        };

        const required = data =>
            (req, res, next) => {
                const missingField = loopReq(req[data.obj], data.fields);

                return !missingField ? next() : res.error({error: `field '${missingField}' is mandatory`}, 422)
            };
        const allowed = data =>
            (req, res, next) => {
                req[data.obj] = checkAllowed(req[data.obj], data.fields);
                next()
            };
        const castFields = data =>
            (req, res, next) => {
                try {
                    const obj = data.obj;

                    data.fields.forEach(field => {
                        if (typeof req[obj][field] !== 'undefined') {

                            switch (data.cast.name) {
                                case 'Boolean':
                                    req[obj][field] = castToBoolean(req[obj][field]);
                                    break;
                                case 'Date':
                                    req[obj][field] = new Date(req[obj][field]);
                                    break;
                                case 'Number':
                                    req[obj][field] = Number(req[obj][field]);
                                    if (String(req[obj][field]) === 'NaN')
                                        throw `illegal conversion of '${field}' to number`;
                                    break;
                                default:
                                    req[obj][field] = data.cast(req[obj][field]);
                                    break;
                            }
                        }
                    });

                    return next();
                }
                catch (e) {
                    return res.error({error: e.toString()}, 400);
                }
            };
        const custom = data =>
            (req, res, next) => {
                try {
                    const obj = data.obj;

                    data.fields.forEach(field => {
                        if (typeof req[obj][field] !== 'undefined') {
                            if (!data.func(req[obj][field]))
                                throw `field '${field}' has not a valid value`;
                        }
                    });

                    return next();
                }
                catch (e) {
                    return res.error({error: e.toString()}, data.status);
                }
            };
        const uploadFile = data =>
            (req, res, next) => {

                if (!Array.isArray(data))
                    data = [data];

                try {
                    data.forEach(d => createFolder(d.folder));
                } catch (e) {
                    return res({error: e});
                }

                let upload = multer({
                    storage: storage(data.map(d => { return { name: d.name, folder: d.folder } })),
                    fileFilter: fileFilter(data.map(d => { return { name: d.name, type: d.type } }))
                });

                upload = upload.fields(data.map(d => { return { name: d.name, maxCount: d.count } }));

                upload(req, res, function (err) {
                    if (err) // err instanceof multer.MulterError
                        return res.error({error: e});

                    return next();
                });
            };

        rogue.middlewares = {
            required   : (obj, fields)                     => required({obj, fields}),
            allowed    : (obj, fields)                     => allowed({obj, fields}),
            castFields : (obj, fields, cast)               => castFields({obj, fields, cast}),
            custom     : (obj, fields, func, status = 500) => custom({obj, fields, func, status}),
            uploadFile : (obj)                             => uploadFile(obj),
        };

        rogue.policies = requireAll({
            dirname: rogue.getRootDir() + '/policies',
            resolve: policy => policy(rogue),
            map: (name) => (name.charAt(0).toUpperCase() + name.substr(1).toLowerCase())
        });
    }
};