const fs = require('fs')
const path = require('path')
const { expect } = require('@hapi/code')
const Lab = require('@hapi/lab')
const AdmZip = require('adm-zip')
const FormData = require('form-data')
const streamToPromise = require('stream-to-promise')
const knexConfig = require('../../knexfile')
const dbInstance = require('knex')(knexConfig)
const users = require('../../seeds/mock/users')
const { init } = require('../../src/server/init-server')
const { config } = require('../../src/server/noauth-config')
const { sampleApp } = require('./sample-app')

const {
    it,
    describe,
    afterEach,
    beforeEach,
    before,
} = (exports.lab = Lab.script())

const createFormForApp = ({ app, bundle, logo }) => {
    const form = new FormData()
    form.append('app', JSON.stringify(app))
    form.append('file', bundle, {
        filename: 'bundle.zip',
    })
    form.append('logo', logo, {
        filename: 'logo.png',
    })
    return form
}

const readFixture = file =>
    fs.readFileSync(path.join(__dirname, '../fixtures/', file))

const createAppRequest = async ({
    app,
    bundle = readFixture('sample-app.zip'),
    logo = readFixture('sample-app-logo.png'),
}) => {
    const form = createFormForApp({
        app,
        bundle,
        logo,
    })
    return {
        method: 'POST',
        url: '/api/v1/apps',
        headers: form.getHeaders(),
        payload: await streamToPromise(form),
    }
}

const createBundle = ({ manifest, d2Config }) => {
    const zip = new AdmZip()
    if (manifest) {
        zip.addFile(
            'manifest.webapp',
            Buffer.from(JSON.stringify(manifest), 'utf8')
        )
    }
    if (d2Config) {
        zip.addFile(
            'd2.config.json',
            Buffer.from(JSON.stringify(d2Config), 'utf8')
        )
    }
    return zip.toBuffer()
}

const sampleAppManifest = {
    name: sampleApp.name,
    version: sampleApp.version.version,
    core_app: false,
}

describe('v1/apps', () => {
    let server
    let db

    before(() => {
        config.auth.noAuthUserIdMapping = users[1].id
    })

    beforeEach(async () => {
        db = await dbInstance.transaction()

        server = await init(db, config)
    })

    afterEach(async () => {
        await server.stop()

        await db.rollback()
    })

    describe('create app', () => {
        it('should create an app', async () => {
            const req = await createAppRequest({ app: sampleApp })

            const res = await server.inject(req)
            expect(res.statusCode).to.equal(201)
            const receivedPayload = JSON.parse(res.payload)
            expect(receivedPayload).to.include(['id'])
            expect(receivedPayload.id).to.be.string()
        })

        it('should return 400 bad request if version is not valid', async () => {
            const badVersionApp = {
                ...sampleApp,
                version: {
                    ...sampleApp.version,
                    version: 'not a version',
                },
            }
            const req = await createAppRequest({ app: badVersionApp })

            const res = await server.inject(req)
            expect(res.statusCode).to.equal(400)
        })

        it('should return 400 bad request if app metadata does not match manifest', async () => {
            const tests = [
                {
                    fields: { name: 'A different app' },
                    expectedError: 'Manifest name does not match app name',
                },
                {
                    fields: { version: '1.2.3' },
                    expectedError:
                        'Manifest version does not match app version',
                },
                {
                    fields: { core_app: true },
                    expectedError:
                        'Manifest incorrectly declares app as core app',
                },
            ]
            for (const { fields, expectedError } of tests) {
                const req = await createAppRequest({
                    app: sampleApp,
                    bundle: createBundle({
                        manifest: {
                            ...sampleAppManifest,
                            ...fields,
                        },
                    }),
                })

                const res = await server.inject(req)
                expect(res.statusCode).to.equal(400)
                const { message } = JSON.parse(res.payload)
                expect(message).to.equal(expectedError)
            }
        })

        it('should return 400 bad request if app metadata does not match d2 config', async () => {
            const d2Config = {
                title: sampleApp.name,
                version: sampleApp.version.version,
                coreApp: false,
            }
            const tests = [
                {
                    fields: { title: 'A different app' },
                    expectedError: 'D2 config title does not match app name',
                },
                {
                    fields: { version: '1.2.3' },
                    expectedError:
                        'D2 config version does not match app version',
                },
                {
                    fields: { coreApp: true },
                    expectedError:
                        'D2 config incorrectly declares app as core app',
                },
            ]
            for (const { fields, expectedError } of tests) {
                const req = await createAppRequest({
                    app: sampleApp,
                    bundle: createBundle({
                        manifest: sampleAppManifest,
                        d2Config: {
                            ...d2Config,
                            ...fields,
                        },
                    }),
                })

                console.log(expectedError)
                const res = await server.inject(req)
                expect(res.statusCode).to.equal(400)
                const { message } = JSON.parse(res.payload)
                expect(message).to.equal(expectedError)
            }
        })
    })
})
