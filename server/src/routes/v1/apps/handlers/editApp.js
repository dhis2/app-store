const Boom = require('@hapi/boom')

const debug = require('debug')('apphub:server:routes:v1:handlers:editApp')

const EditAppModel = require('../../../../models/v1/in/EditAppModel')

const {
    getCurrentUserFromRequest,
    currentUserIsManager,
} = require('../../../../security')

const { updateApp, getOrganisationAppsByUserId } = require('../../../../data')

module.exports = {
    method: 'PUT',
    path: '/v1/apps/{appId}',
    config: {
        auth: 'token',
        tags: ['api', 'v1'],
        validate: {
            payload: EditAppModel.payloadSchema,
            failAction: (request, h, err) => {
                return err
            },
        },
        plugins: {
            //TODO: set correct payloadType for 'hapi-swagger'
            /*'hapi-swagger': {
                payloadType: 'form'
            }*/
        },
        response: {
            status: {
                //TODO: add response statuses
            },
        },
    },
    handler: async (request, h) => {
        request.logger.info('In handler %s', request.path)

        const db = h.context.db

        const currentUser = await getCurrentUserFromRequest(request, db)
        const appsUserCanEdit = await getOrganisationAppsByUserId(
            currentUser.id,
            db
        )
        const userCanEditApp =
            appsUserCanEdit.filter(app => app.app_id === request.params.appId)
                .length > 0

        debug('appsUserCanEdit:', appsUserCanEdit)
        debug('userCanEditApp:', userCanEditApp)

        const isManager = currentUserIsManager(request)
        if (isManager || userCanEditApp) {
            //can edit app
            const transaction = await db.transaction()

            try {
                const {
                    name,
                    description,
                    appType,
                    sourceUrl,
                    coreApp
                } = request.payload

                await updateApp(
                    {
                        id: request.params.appId,
                        userId: currentUser.id,
                        name,
                        description,
                        sourceUrl,
                        appType,
                        languageCode: 'en',
                        coreApp: isManager ? coreApp : undefined
                    },
                    db,
                    transaction
                )

                //TODO: update developer/organisation. Create new developer if e-mail & name changed or update old?

                await transaction.commit()
            } catch (err) {
                await transaction.rollback()
                throw Boom.internal(err)
            }
        } else {
            throw Boom.unauthorized()
        }

        //What the old v1 api responds with on this endpoint if all works out
        return {
            httpStatus: 'OK',
            httpStatusCode: 200,
            message: 'App updated',
        }
    },
}
