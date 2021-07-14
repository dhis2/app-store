exports.up = async function (knex) {
    await knex.schema.table('app', table => {
        table.boolean('core_app').defaultTo(false)
    })
    await knex.raw('DROP VIEW apps_view')
    // update app-view with column
    await knex.raw(`
    CREATE VIEW apps_view AS
    SELECT  app.id AS app_id,
            app.type,
            app.core_app,
            appver.version, appver.id AS version_id, appver.created_at AS version_created_at, appver.source_url, appver.demo_url,
            media.app_media_id AS media_id, media.original_filename, media.created_at AS media_created_at, media.media_type,
            localisedapp.language_code, localisedapp.name, localisedapp.description, localisedapp.slug AS appver_slug,
            s.status, s.created_at AS status_created_at,
            ac.min_dhis2_version, ac.max_dhis2_version,
            c.name AS channel_name, c.id AS channel_id,
            app.contact_email AS contact_email,
            users.id as owner_id, users.name as owner_name, users.email as owner_email,
            org.name AS organisation, org.slug AS organisation_slug, org.email as organisation_email

        FROM app

        INNER JOIN app_status AS s
            ON s.app_id = app.id

        INNER JOIN app_version AS appver
            ON appver.app_id = s.app_id

        LEFT JOIN app_media_view AS media
            ON media.app_id = s.app_id

        INNER JOIN app_version_localised AS localisedapp
            ON localisedapp.app_version_id = appver.id

        INNER JOIN app_channel AS ac
            ON ac.app_version_id = appver.id

        INNER JOIN channel AS c
            ON c.id = ac.channel_id

        INNER JOIN users
            ON users.id = app.created_by_user_id

        INNER JOIN organisation AS org
            ON org.id = app.organisation_id
`)
}

exports.down = async function (knex) {
    await knex.raw('DROP VIEW apps_view')
    await knex.schema.table('app', table => {
        table.dropColumn('core_app')
    })

    await knex.raw(`
    CREATE VIEW apps_view AS
    SELECT  app.id AS app_id,
          app.type,
          appver.version, appver.id AS version_id, appver.created_at AS version_created_at, appver.source_url, appver.demo_url,
          media.app_media_id AS media_id, media.original_filename, media.created_at AS media_created_at, media.media_type,
          localisedapp.language_code, localisedapp.name, localisedapp.description, localisedapp.slug AS appver_slug,
          s.status, s.created_at AS status_created_at,
          ac.min_dhis2_version, ac.max_dhis2_version,
          c.name AS channel_name, c.id AS channel_id,
          app.contact_email AS contact_email,
          users.id as owner_id, users.name as owner_name, users.email as owner_email,
          org.name AS organisation, org.slug AS organisation_slug, org.email as organisation_email

      FROM app

      INNER JOIN app_status AS s
          ON s.app_id = app.id

      INNER JOIN app_version AS appver
          ON appver.app_id = s.app_id

      LEFT JOIN app_media_view AS media
          ON media.app_id = s.app_id

      INNER JOIN app_version_localised AS localisedapp
          ON localisedapp.app_version_id = appver.id

      INNER JOIN app_channel AS ac
          ON ac.app_version_id = appver.id

      INNER JOIN channel AS c
          ON c.id = ac.channel_id

      INNER JOIN users
          ON users.id = app.created_by_user_id

      INNER JOIN organisation AS org
          ON org.id = app.organisation_id
`)
}
