const path = require('path')

const Knex = require('knex')
const Hapi = require('hapi')
const Pino = require('hapi-pino')

const jwt = require('hapi-auth-jwt2')

const Inert = require('inert')
const Vision = require('vision')
const Blipp = require('blipp')

const webpack = require('webpack')

const HapiSwagger = require('hapi-swagger')

if (process.env.NODE_ENV !== 'production') {
    const config = require('dotenv').config({
        path: `${require('os').homedir()}/.dhis2/appstore/vars`,
    })
    console.log('Injecting config vars into process.env: ', config)
}

console.log('Using env: ', process.env.NODE_ENV)

const routes = require('./routes')

const knexConfig = require('../knexfile')

// server things before start
const db = new Knex(knexConfig[process.env.NODE_ENV])
console.log(knexConfig[process.env.NODE_ENV])

const server = Hapi.server({
    port: process.env.PORT || 3000,
    host: 'localhost',
    routes: {
        cors: {
            //TODO: load the URLs from database or something, so we can dynamically manage these
            origin: ['http://localhost:9000'],
        },
    },
})

server.bind({
    db,
})

// kick it
const init = async () => {
    //Add pino, logging lib
    await server.register({
        plugin: Pino,
        options: {
            prettyPrint: process.env.NODE_ENV !== 'test',
            //redact: ['req.headers.authorization']
        },
    })

    //Swagger + deps to render swaggerui
    //served from the url /documentation
    await server.register([
        Inert,
        Vision,
        Blipp,
        {
            plugin: HapiSwagger,
            options: require('./options').swaggerOptions,
        },
    ])

    if (
        process.env.AUTH_STRATEGY === 'jwt' &&
        process.env.AUTH0_SECRET &&
        process.env.AUTH0_M2M_SECRET &&
        process.env.AUTH0_AUDIENCE &&
        process.env.AUTH0_DOMAIN &&
        process.env.AUTH0_ALG
    ) {
        await server.register(jwt)

        const registerAuth0 = require('./registerAuth0')

        registerAuth0(server, db, {
            key: [process.env.AUTH0_SECRET, process.env.AUTH0_M2M_SECRET],
            verifyOptions: {
                audience: process.env.AUTH0_AUDIENCE,
                issuer: process.env.AUTH0_DOMAIN,
                algorithms: [process.env.AUTH0_ALG],
            },
        })
    } else {
        //Warn with red background
        console.warn(
            '\x1b[41m',
            'No authentication method configured, all endpoints are running unprotected',
            '\x1b[0m'
        )
        if (!process.env.NO_AUTH_MAPPED_USER_ID) {
            console.error(
                '\x1b[41m',
                'Running without authentication requires to setup mapping to a user to use for requests requiring a current user id (e.g. creating apps for example). Set process.env.NO_AUTH_MAPPED_USER_ID',
                '\x1b[m'
            )
            process.exit(1)
            return
        }
    }

    //Temporary route to serve frontend static build until we've flattened the project structure
    server.route([
        {
            method: 'GET',
            path: '/appstore/assets/{param*}',
            handler: {
                directory: {
                    path: path.join(__dirname, '../static/assets/'),
                },
            },
        },
        {
            method: 'GET',
            path: '/appstore/js/{param*}',
            handler: {
                directory: {
                    path: path.join(__dirname, '../static/js/'),
                },
            },
        },
        {
            method: 'GET',
            path: '/appstore/{param*}',
            handler: {
                file: path.join(__dirname, '../static/index.html'),
            },
        },
    ])

    server.realm.modifiers.route.prefix = '/api'
    server.route(routes)

    await server.start()

    console.log(`Server running at: ${server.info.uri}`)
}

process.on('unhandledRejection', err => {
    console.log(err)
    process.exit(1)
})

const compile = () => new Promise((resolve, reject) => {
    webpack(require('../webpack.config.js'), (err, stats) => {
        if (err || stats.hasErrors()) {
            reject({ err, stats })
        } else {
            resolve(stats)
        }
    })
})

// kick it off
compile()
    .then(db.migrate.latest)
    .then(init)
    .catch(err => {
        console.error('Boostrap error:', err)
        if (err.stats && err.stats.hasErrors()) {
            console.error(err.stats.compilation.errors)
        }
        process.exit(1)
    })

module.exports = { server, db }