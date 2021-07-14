const Boom = require('@hapi/boom')
const Bounce = require('@hapi/bounce')
const { AppStatus, MediaType } = require('../../../../enums')
const CreateAppModel = require('../../../../models/v1/in/CreateAppModel')
const {
    canCreateApp,
    getCurrentUserFromRequest,
    currentUserIsManager,
    verifyBundle,
} = require('../../../../security')
const App = require('../../../../services/app')
const Organisation = require('../../../../services/organisation')
const { saveFile } = require('../../../../utils')
const { validateImageMetadata } = require('../../../../utils/validateMime')

module.exports = {
    method: 'POST',
    path: '/v1/apps',
    config: {
        auth: 'token',
        tags: ['api', 'v2'],
        payload: {
            maxBytes: 20 * 1024 * 1024, //20MB
            allow: 'multipart/form-data',
            parse: true,
            output: 'stream',
            multipart: true,
        },
        validate: {
            payload: CreateAppModel.payloadSchema,
        },
        plugins: {
            'hapi-swagger': {
                payloadType: 'form',
            },
        },
    },
    handler: async (request, h) => {
        if (!canCreateApp(request, h)) {
            throw Boom.unauthorized()
        }

        const { db } = h.context
        const { id: currentUserId } = await getCurrentUserFromRequest(
            request,
            db
        )
        const isManager = currentUserIsManager(request)

        const { payload } = request
        const appJsonPayload = JSON.parse(payload.app)
        const appJsonValidationResult =
            CreateAppModel.def.validate(appJsonPayload)

        if (appJsonValidationResult.error) {
            throw Boom.badRequest(appJsonValidationResult.error)
        }

        const { email: contactEmail, organisationId } = appJsonPayload.developer
        const organisation = await Organisation.findOne(
            organisationId,
            false,
            db
        )
        if (!organisation) {
            throw Boom.badRequest('Unknown organisation')
        }

        const isMember = await Organisation.hasUser(
            organisationId,
            currentUserId,
            db
        )
        if (!isMember && !isManager) {
            throw Boom.unauthorized(
                `You don't have permission to upload apps to that organisation`
            )
        }

        const app = await db.transaction(async trx => {
            const { appType } = appJsonPayload
            const { file } = payload

            const { name, description, sourceUrl } = appJsonPayload
            const {
                version,
                demoUrl,
                minDhisVersion,
                maxDhisVersion,
                channel,
            } = appJsonPayload.version

            let isCoreApp
            try {
                const { manifest } = verifyBundle({
                    buffer: file._data,
                    appId: null, // this can never be identical on first upload
                    appName: name,
                    version,
                    organisationName: organisation.name,
                })

                isCoreApp = manifest.core_app
                if (isCoreApp && !isManager) {
                    throw Boom.unauthorized(
                        `You don't have permission to upload core apps`
                    )
                }
            } catch (error) {
                Bounce.rethrow(error, 'system')
                throw Boom.badRequest(error)
            }
            const app = await App.create(
                {
                    userId: currentUserId,
                    contactEmail,
                    organisationId,
                    appType,
                    status: AppStatus.PENDING,
                    coreApp: isCoreApp,
                },
                trx
            )

            const appVersion = await App.createVersionForApp(
                app.id,
                {
                    userId: currentUserId,
                    version,
                    demoUrl,
                    sourceUrl,
                    minDhisVersion,
                    maxDhisVersion: maxDhisVersion || '',
                    channel,
                    appName: name,
                    description: description || '',
                },
                trx
            )

            const { logo } = payload
            const logoMetadata = logo.hapi
            validateImageMetadata(request.server.mime, logoMetadata)

            const { id: logoId } = await App.createMediaForApp(
                app.id,
                {
                    userId: currentUserId,
                    mediaType: MediaType.Logo,
                    filename: logoMetadata.filename,
                    mime: logoMetadata.headers['content-type'],
                    caption: 'App logo',
                    description: '',
                },
                trx
            )

            const appUpload = saveFile(
                `${app.id}/${appVersion.id}`,
                'app.zip',
                file._data
            )
            const logoUpload = saveFile(app.id, logoId, logo._data)
            await Promise.all([appUpload, logoUpload])

            return app
        })

        return h.response(app).created(`/v2/apps/${app.id}`)
    },
}
