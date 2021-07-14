const Joi = require('@hapi/joi')
const { AppTypes } = require('../../../enums')

const CreateModelAppData = Joi.object().keys({
    appType: Joi.string().valid(...AppTypes),
    developer: Joi.object().keys({
        organisationId: Joi.string(),
    }),
    coreApp: Joi.bool(),
})

const payloadSchema = Joi.object({
    app: Joi.any(),
})

module.exports = {
    payloadSchema,
    def: CreateModelAppData,
    validate: obj => CreateModelAppData.validate(obj),
}
