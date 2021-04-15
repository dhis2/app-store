const joi = require('@hapi/joi')

const paramsSchema = joi
    .object()
    .keys({
        email: joi
            .string()
            .email()
            .required(),
        name: joi.string(),
    })
    .options({ allowUnknown: true })

/**
 * @typedef CreateUserResult
 * @property {number} id The inserted database id for the user
 * @property {string} uuid The generated UUID for the user
 * @property {string} email Email stored for the user
 * @property {string} name Name of the user
 */

/**
 * Creates a new user
 *
 * @param {object} params
 * @param {string} params.email The user email
 * @param {string} params.name The name of the user
 * @param {object} knex DB instance of knex, or transaction
 * @returns {Promise<CreateUserResult>}
 */
const createUser = async (params, knex) => {
    const validation = paramsSchema.validate(params)

    if (validation.error !== undefined) {
        throw new Error(validation.error)
    }

    if (!knex) {
        throw new Error('Missing parameter: knex')
    }

    const { email, name } = params

    const [id] = await knex
        .insert({
            email,
            name,
            created_at: knex.fn.now(),
        })
        .into('users')
        .returning('id')

    return { id, email, name }
}

module.exports = createUser
