


const { AppStatus } = require('@enums')
const AWSFileHandler = require('../../../../utils/AWSFileHandler')

module.exports = {
    //unauthenticated endpoint returning the approved app for the specified uuid
    method: 'GET',
    path: '/v1/apps/download/{organisation_slug}/{appver_slug}/{app_version}/app.zip',
    config: {
        auth: false,
        tags: ['api', 'v1']
    },
    handler: async (request, h) => {

        request.logger.info('In handler %s', request.path)

        const { organisation_slug, appver_slug, app_version } = request.params

        const knex = h.context.db

        const appRows = await knex
            .select()
            .from('apps_view')
            .where({
                organisation_slug,
                appver_slug,
                'version': app_version,
                'status': AppStatus.APPROVED,
                'language_code': 'en'
            })

        const item = appRows[0]

        //TODO: improve by streaming instead of first downloading then responding with the zip?
        //or pass out the aws url directly
        console.log(`Fetching file from ${item.uuid}/${item.version_uuid}`)
        const fileHandler = new AWSFileHandler(process.env.AWS_REGION, process.env.AWS_BUCKET_NAME)
        const file =  await fileHandler.getFile(`${item.uuid}/${item.version_uuid}`, 'app.zip')

        return h.response(file.Body)
            .type('application/zip')
            .header('Content-length', file.ContentLength)
    }
}