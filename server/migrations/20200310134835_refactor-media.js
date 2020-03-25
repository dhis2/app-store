exports.up = async knex => {
    await knex.raw('DROP VIEW apps_view')

    //Copy existing data to a new temp/old table.
    await knex.raw(
        'CREATE TABLE old_app_version_media AS TABLE app_version_media'
    )
    await knex.schema.dropTable('app_version_media')

    //Create the new separate media table
    await knex.schema.createTable('media', table => {
        table.uuid('id').primary()

        table.string('original_filename', 255).notNullable()

        table
            .timestamp('created_at', true)
            .defaultTo(knex.fn.now())
            .notNullable()

        table.uuid('created_by_user_id').notNullable()

        table.uuid('media_type_id').notNullable()

        table
            .foreign('media_type_id')
            .references('id')
            .inTable('media_type')
    })

    //Link between app and media
    await knex.schema.createTable('app_media', table => {
        table.uuid('id').primary()

        table.uuid('media_id')

        table
            .foreign('media_id')
            .references('id')
            .inTable('media')

        table
            .integer('image_type') //enum/integer from code so no uuid here. Logo or Screenshot
            .notNullable()

        table
            .timestamp('created_at', true)
            .defaultTo(knex.fn.now())
            .notNullable()

        table.uuid('created_by_user_id').notNullable()

        table.uuid('app_id').notNullable()

        table
            .foreign('app_id')
            .references('id')
            .inTable('app')
            .onDelete('CASCADE')
    })

    //Links an app version to a specific media
    await knex.schema.createTable('app_version_media', table => {
        table.uuid('id').primary()

        table.uuid('media_id')

        table
            .foreign('media_id')
            .references('id')
            .inTable('media')

        table
            .integer('image_type') //enum/integer from code so no uuid here. Logo or Screenshot
            .notNullable()

        table
            .timestamp('created_at', true)
            .defaultTo(knex.fn.now())
            .notNullable()

        table.uuid('created_by_user_id').notNullable()

        table.uuid('app_version_id').notNullable()

        table
            .foreign('app_version_id')
            .references('id')
            .inTable('app_version')
            .onDelete('CASCADE')
    })

    //Set uuid4 auto on primary keys
    await knex.raw(
        `ALTER TABLE app_version_media ALTER COLUMN id SET DEFAULT uuid_generate_v4();
         ALTER TABLE app_media ALTER COLUMN id SET DEFAULT uuid_generate_v4();
         ALTER TABLE media ALTER COLUMN id SET DEFAULT uuid_generate_v4();`
    )

    //copy over data from the old/temp table with existing data and then drop it
    await knex.raw(
        `INSERT INTO app_media(media_id, app_id, created_by_user_id)
         SELECT oavm.id AS media_id, app_id, oavm.created_by_user_id FROM old_app_version_media AS oavm
         INNER JOIN app_version ON app_version.id = oavm.app_version_id `
    )
    await knex.raw(
        `INSERT INTO media(id, original_filename, media_type_id, created_by_user_id, created_at) 
         SELECT id, original_filename, media_type_id, created_by_user_id, created_at FROM old_app_version_media
        `
    )
    await knex.raw('DROP TABLE old_app_version_media')

    //Create a view to make it easier querying for media for a specific app
    await knex.raw(`
        CREATE VIEW app_media_view AS
            SELECT app.id AS app_id, media.id AS media_id, app_media.image_type, 
            media.original_filename, media.created_at, media.created_by_user_id, media.media_type_id 

            FROM media 

            INNER JOIN 
                app_media 
                ON app_media.media_id = media.id

            INNER JOIN
                app
                ON app_media.app_id = app.id
    `)

    //Create a view to make it easier querying for media for a specific app version
    await knex.raw(`
        CREATE VIEW app_version_media_view AS
            SELECT app_version.app_id, app_version.id AS app_version_id, media.id AS media_id, app_version_media.image_type,
            media.original_filename, media.created_at, media.created_by_user_id, media.media_type_id 

            FROM media 

            INNER JOIN 
                app_version_media 
                ON app_version_media.media_id = media.id

            INNER JOIN
                app_version
                ON app_version_media.app_version_id = app_version.id
    `)

    //Recreate the apps_view view using the media views above
    await knex.raw(`
        CREATE VIEW apps_view AS
            SELECT  app.id AS app_id, 
                    app.type,
                    appver.version, appver.id AS version_id, appver.created_at AS version_created_at, appver.source_url, appver.demo_url,
                    media.media_id, media.original_filename, media.created_at AS media_created_at, media.image_type,  
                    localisedapp.language_code, localisedapp.name, localisedapp.description, localisedapp.slug AS appver_slug, 
                    s.status, s.created_at AS status_created_at, 
                    ac.min_dhis2_version, ac.max_dhis2_version, 
                    c.name AS channel_name, c.id AS channel_id,
                    users.id AS developer_id, users.name AS developer_name,
                    users.email AS developer_email,
                    org.name AS organisation, org.slug AS organisation_slug

                FROM app 

                INNER JOIN app_status AS s
                    ON s.app_id = app.id

                INNER JOIN app_version AS appver
                    ON appver.app_id = s.app_id

                INNER JOIN app_media_view AS media
                    ON media.app_id = s.app_id

                INNER JOIN app_version_localised AS localisedapp
                    ON localisedapp.app_version_id = appver.id

                INNER JOIN app_channel AS ac
                    ON ac.app_version_id = appver.id

                INNER JOIN channel AS c 
                    ON c.id = ac.channel_id

                INNER JOIN users
                    ON users.id = app.developer_user_id

                INNER JOIN organisation AS org 
                    ON org.id = app.organisation_id
    `)
}

exports.down = async knex => {
    //create a new app_version_media table to match the previous version
    await knex.schema.createTable('app_version_media_temp', table => {
        table.uuid('id').primary()

        table
            .integer('image_type') //enum/integer from code so no uuid here
            .notNullable()

        table.string('original_filename', 255).notNullable()

        table
            .timestamp('created_at', true)
            .defaultTo(knex.fn.now())
            .notNullable()

        table.string('caption', 255)
        table.string('description', 255)

        table.uuid('created_by_user_id').notNullable()

        table.uuid('media_type_id').notNullable()

        table
            .foreign('media_type_id')
            .references('id')
            .inTable('media_type')

        table.uuid('app_version_id').notNullable()

        table
            .foreign('app_version_id')
            .references('id')
            .inTable('app_version')
            .onDelete('CASCADE')
    })

    await knex.raw(
        `ALTER TABLE app_version_media_temp ALTER COLUMN id SET DEFAULT uuid_generate_v4();`
    )

    //Copy over data
    await knex.raw(`
        INSERT INTO app_version_media_temp(id, image_type, original_filename, created_at, media_type_id, app_version_id, created_by_user_id) 
        SELECT media_id AS id, image_type, original_filename, created_at, media_type_id, app_version_id, created_by_user_id FROM app_version_media_view
    `)

    //Drop views and tables
    await knex.raw('DROP VIEW apps_view')
    await knex.raw('DROP VIEW app_media_view')
    await knex.raw('DROP VIEW app_version_media_view')

    await knex.schema.dropTable('app_media')
    await knex.schema.dropTable('app_version_media')
    await knex.schema.dropTable('media')

    //Rename copied data to final table name
    await knex.schema.raw(
        'ALTER TABLE app_version_media_temp RENAME TO app_version_media'
    )

    //Recreate the previous apps_view
    await knex.raw(`
        CREATE VIEW apps_view AS
            SELECT  app.id AS app_id, 
                    app.type,
                    appver.version, appver.id AS version_id, appver.created_at AS version_created_at, appver.source_url, appver.demo_url,
                    media.id AS media_id, media.original_filename, media.created_at AS media_created_at, media.image_type, media.caption AS media_caption, media.description AS media_description, 
                    localisedapp.language_code, localisedapp.name, localisedapp.description, localisedapp.slug AS appver_slug, 
                    s.status, s.created_at AS status_created_at, 
                    ac.min_dhis2_version, ac.max_dhis2_version, 
                    c.name AS channel_name, c.id AS channel_id,
                    users.id AS developer_id, users.name AS developer_name,
                    users.email AS developer_email,
                    org.name AS organisation, org.slug AS organisation_slug

                FROM app 

                INNER JOIN app_status AS s
                    ON s.app_id = app.id

                INNER JOIN app_version AS appver
                    ON appver.app_id = s.app_id

                LEFT JOIN app_version_media AS media 
                    ON media.app_version_id = appver.id 

                INNER JOIN app_version_localised AS localisedapp
                    ON localisedapp.app_version_id = appver.id

                INNER JOIN app_channel AS ac
                    ON ac.app_version_id = appver.id

                INNER JOIN channel AS c 
                    ON c.id = ac.channel_id

                INNER JOIN users
                    ON users.id = app.developer_user_id

                INNER JOIN organisation AS org 
                    ON org.id = app.organisation_id
    `)
}
