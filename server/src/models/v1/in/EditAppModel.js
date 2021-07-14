const joi = require('@hapi/joi')
const { AppTypes } = require('../../../enums')

const payloadSchema = joi.object({
    appType: joi.string().valid(...AppTypes),
    description: joi.string().allow(''),
    developer: joi.object().keys({
        address: joi.string().allow(''),
        email: joi.string().email(),
        name: joi.string(),
        organisation: joi.string(),
    }),
    name: joi.string().max(100),
    sourceUrl: joi.string().allow(''),
    coreApp: joi.bool(),
})

const EditAppModel = payloadSchema

module.exports = {
    payloadSchema,
    def: EditAppModel,
    validate: objectToValidate => EditAppModel.validate(objectToValidate),
}
