const debug = require('debug')('apphub:server:security:createUserValidation')
const Boom = require('@hapi/boom')
const Bounce = require('@hapi/bounce')
const { wrapError, UniqueViolationError } = require('db-errors')
const { createUser } = require('../data')
const { ROLES } = require('./index')

const customClaimsNamespace = 'https://apps.dhis2.org'
const getNamespacedClaimKey = key => `${customClaimsNamespace}/${key}`

const createUserValidationFunc = (db, audience, auth0ManagementClient) => {
    return async (decoded, request, h) => {
        if (decoded && decoded.sub) {
            debug(`Valid user with external userId: ${decoded.sub}`, decoded)
            const isM2M = decoded.sub === `${audience}@clients`
            const returnObj = { isValid: true, credentials: decoded }
            if (!isM2M) {
                let user = null
                try {
                    const users = await db('users')
                        .innerJoin(
                            'user_external_id',
                            'users.id',
                            'user_external_id.user_id'
                        )
                        .select('users.*')
                        .where({
                            external_id: decoded.sub,
                        })

                    if (users && users.length === 1) {
                        user = users[0]
                        debug(`Found user: ${user.email} with id ${user.id}`)
                    }
                } catch (err) {
                    debug(err)
                }

                if (user === null) {
                    debug('user does not exist in db, create it')
                    let userInfo
                    // get user from auth0
                    try {
                        userInfo = await auth0ManagementClient.getUser({
                            id: decoded.sub,
                        })
                        debug('User with info', userInfo)
                    } catch (e) {
                        debug(e)
                        throw Boom.unauthorized(
                            'Failed to get user information from Identity Provider'
                        )
                    }
                    if (!userInfo.email_verified) {
                        throw Boom.unauthorized('Email not verified')
                    }
                    //create the user if it doesn't exist
                    const createUserTransaction = async trx => {
                        let dbUser
                        try {
                            dbUser = await createUser(
                                {
                                    email: userInfo.email,
                                    name: userInfo.name,
                                },
                                trx
                            )
                        } catch (e) {
                            // if user exist and not current external-id throw a specific error
                            Bounce.ignore(wrapError(e), UniqueViolationError)
                            throw Boom.unauthorized(
                                'Email is already registered with another provider.'
                            )
                        }

                        debug(
                            `created user with id ${dbUser.id} for email ${userInfo.email}`
                        )

                        await trx('user_external_id').insert({
                            user_id: dbUser.id,
                            external_id: decoded.sub,
                        })
                        return dbUser
                    }

                    user = await db.transaction(createUserTransaction)
                }

                returnObj.credentials.userId = user.id
                const roles =
                    returnObj.credentials[getNamespacedClaimKey('roles')]
                returnObj.credentials.roles = roles
            } else if (decoded.sub === `${audience}@clients`) {
                //If we get here we're dealing with an M2M API authenticated user
                const [apiUser] = await db('users')
                    .select('users.*')
                    .innerJoin(
                        'user_external_id',
                        'user_external_id.user_id',
                        'users.id'
                    )
                    .where('external_id', `${audience}@clients`)

                debug('apiUser:', apiUser)

                if (!apiUser) {
                    throw Boom.internal('No M2M user mapped in database.')
                }

                try {
                    //Add the mapped user email to enable it to work through the rest of the permission system
                    returnObj.credentials.email = apiUser.email
                    returnObj.credentials.roles = [ROLES.MANAGER] //the M2M has full access (all roles)
                    returnObj.credentials.email_verified = true
                    returnObj.credentials.userId = apiUser.id
                } catch (err) {
                    throw Boom.internal(err)
                }
            }
            return returnObj
        }

        debug('Invalid user', decoded)
        return { isValid: false }
    }
}

module.exports = createUserValidationFunc
