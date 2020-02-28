const debug = require('debug')('apphub:server:routes:handlers:v1:getAppFile')
const { AppStatus } = require('../../../../enums')
const { getFile } = require('../../../../utils')

module.exports = {
    //unauthenticated endpoint returning the approved app for the specified id
    method: 'GET',
    path:
        '/v1/apps/download/{organisation_slug}/{appver_slug}/{app_version}/app.zip',
    config: {
        auth: false,
        tags: ['api', 'v1'],
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
                version: app_version,
                status: AppStatus.APPROVED,
                language_code: 'en',
            })

        const item = appRows[0]

        //TODO: improve by streaming instead of first downloading then responding with the zip?
        //or pass out the aws url directly
        debug(`Fetching file from ${item.app_id}/${item.version_id}`)
        const file = await getFile(
            `${item.app_id}/${item.version_id}`,
            'app.zip'
        )

        return h
            .response(file.Body)
            .type('application/zip')
            .header('Content-length', file.ContentLength)
    },
}