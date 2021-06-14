const fs = require('fs')
const path = require('path')
const Lab = require('@hapi/lab')
const FormData = require('form-data')
const streamToPromise = require('stream-to-promise')

const { it, describe, beforeEach, afterEach } = (exports.lab = Lab.script())

const { expect } = require('@hapi/code')
const knexConfig = require('../../knexfile')
const db = require('knex')(knexConfig)
const users = require('../../seeds/mock/users')
const { init } = require('../../src/server/init-server')
const { sampleApp } = require('./sample-app')

describe('test delete app', () => {
    const { config } = require('../../src/server/noauth-config')
    let server
    beforeEach(async () => {
        config.auth.noAuthUserIdMapping = users[0].id
        server = await init(db, config)
    })

    afterEach(async () => {
        await server.stop()
    })

    const createFormForApp = app => {
        const readFixture = file => fs.createReadStream(
            path.join(__dirname, '../fixtures/', file)
        )

        const form = new FormData()
        form.append('app', JSON.stringify(app))
        form.append('file', readFixture('sample-app.zip'))
        form.append('logo', readFixture('sample-app-logo.png'))
        return form
    }

    it('should be able to delete an app', async () => {
        //First upload the app, then delete it
        const form = createFormForApp(sampleApp)
        const request = {
            method: 'POST',
            url: '/api/v1/apps',
            headers: form.getHeaders(),
            payload: await streamToPromise(form),
        }

        const res = await server.inject(request)
        expect(res.statusCode).to.equal(201)
        const { id: appId } = JSON.parse(res.payload)

        const deleteResponse = await server.inject({
            method: 'DELETE',
            url: '/api/v1/apps/' + appId,
        })
        expect(deleteResponse.statusCode).to.equal(200)
    })
})
