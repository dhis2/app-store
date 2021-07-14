const joi = require('@hapi/joi')
const debug = require('debug')('apphub:server:data:createApp')
const { AppTypes } = require('../enums')

const paramsSchema = joi
    .object()
    .keys({
        userId: joi.string().uuid().required(),
        contactEmail: joi.string().email(),
        orgId: joi.string().uuid().required(),
        appType: joi
            .string()
            .required()
            .valid(...AppTypes),
        coreApp: joi.bool(),
    })
    .options({ allowUnknown: true })

/**
 * @typedef {object} CreateAppResult
 * @property {number} id Database id of the created app
 * @property {string} id The generated id for the created app
 */

/**
 * Creates an app and returns the database id
 *
 * @param {object} params
 * @param {number} params.userId User id creating the app (admin, manager, api user making the actual upload)
 * @param {number} params.developerUserId User id for the developer of the app
 * @param {number} params.orgId Organisation id for the organisation owning this app
 * @param {string} params.appType Type of the app
 * @param {object} knex DB instance of knex, or transaction
 * @returns {Promise<CreateAppResult>}
 */
const createApp = async (params, knex) => {
    const validation = paramsSchema.validate(params)

    if (validation.error !== undefined) {
        throw new Error(validation.error)
    }

    debug('params: ', params)
    const { userId, contactEmail, orgId, appType, coreApp } = params

    //generate a new uuid to insert

    try {
        const [id] = await knex('app')
            .insert({
                created_at: knex.fn.now(),
                created_by_user_id: userId,
                contact_email: contactEmail,
                organisation_id: orgId,
                type: appType,
                core_app: coreApp,
            })
            .returning('id')

        return { id }
    } catch (err) {
        throw new Error(`Could not insert app to database. ${err.message}`)
    }
}

module.exports = createApp
