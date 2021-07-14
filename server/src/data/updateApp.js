const joi = require('@hapi/joi')
const { AppTypes } = require('../enums')
const { slugify } = require('../utils/slugify')

const paramsSchema = joi
    .object()
    .keys({
        id: joi.string().uuid().required(),
        userId: joi.string().uuid().required(),
        name: joi.string().max(100),
        description: joi.string().allow(''),
        appType: joi.string().valid(...AppTypes),
        sourceUrl: joi
            .string()
            .allow('')
            .max(500)
            .uri({
                scheme: ['http', 'https'],
            }),
        languageCode: joi.string().max(2).required(),
        coreApp: joi.bool(),
    })
    .options({ allowUnknown: true })

const isValidSourceUrl = sourceUrl => {
    try {
        const url = new URL(sourceUrl)
        return url.protocol === 'http:' || url.protocol === 'https:'
    } catch (error) {
        return false
    }
}

/**
 * Updates an app
 *
 * @param {object} params
 * @param {string} params.id id of the app to update
 * @param {number} params.userId The user id of the user making the change
 * @param {string} params.name The name of the app
 * @param {string} params.description Description of the app
 * @param {string} params.sourceUrl The URL to the source code of the app, for example https://github.com/dhis2/app-hub
 * @param {string} params.languageCode The 2 char language code for which language to update
 * @param {object} knex DB instance or transaction
 * @returns {Promise<CreateUserResult>}
 */
const updateApp = async (params, knex) => {
    const validation = paramsSchema.validate(params)

    if (validation.error !== undefined) {
        throw new Error(validation.error)
    }

    if (!knex) {
        throw new Error('Missing parameter: knex')
    }

    const {
        id,
        userId,
        name,
        sourceUrl,
        appType,
        description,
        languageCode,
        coreApp,
    } = params

    try {
        const appVersionIdsToUpdate = await knex('app_version')
            .select('app_version.id')
            .innerJoin('app', 'app.id', 'app_version.app_id')
            .where('app.id', id)
            .pluck('app_version.id')

        await knex('app')
            .update({
                type: appType,
                updated_at: knex.fn.now(),
                updated_by_user_id: userId,
                core_app: coreApp,
            })
            .where({
                id,
            })

        await knex('app_version')
            .update({
                source_url: isValidSourceUrl(sourceUrl) ? sourceUrl : null,
                updated_at: knex.fn.now(),
                updated_by_user_id: userId,
            })
            .whereIn('id', appVersionIdsToUpdate)

        await knex('app_version_localised')
            .update({
                name,
                slug: slugify(name),
                description,
                updated_at: knex.fn.now(),
                updated_by_user_id: userId,
            })
            .whereIn('app_version_id', appVersionIdsToUpdate)
            .where('language_code', languageCode)
    } catch (err) {
        throw new Error(`Could not update app: ${id}. ${err.message}`)
    }
}

module.exports = updateApp
