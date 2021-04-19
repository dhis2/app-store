

# Onboarding

This document will serve as a more thorough documentation for App Hub, hopefully providing some insight into the architecture and making it easier to contribute to the project. This will mainly cover the backend. For information about getting the project set up, see the readme.

### Background

The App Hub was previously called App Store, and was written in Java. It was decided that Team Platform should maintain it, so it was rewritten in Node.js for familiarity and ease of adding new features. The database was completely redisgned and thought was put into making normalized. The API was kept the same and is available under `api/v1/`. The idea was that we could use the same client without modification. That has worked great, and we've added more features since then.

### External Libraries

The backend is built around Hapi. Hapi is a configuration oriented framework for creating backend services. It has a huge ecosystem of modules and plugins, and has no external dependencies which means more control of security. It can be a bit overwhelming when looking at the [modules-page](https://hapi.dev/module/?sort=name), but we're not using most of these. 

The most important modules to get familiar with are *Joi*, *Boom* and *Bounce*.

**Joi** is an extremely powerful library for describing and validating data. It has since the start of the project left the Hapi-ecosystem and is now standalone, but is still an integral part of Hapi, but it can now be used without it as well. We are using Joi to validate everything from post-data and query-params to database-data. The cool thing about Joi is that it can be easily used to transform and coerce your data as well. This means that we have one place to describe the validation, requirements and transformation of data in our application. We will come back to how integral Joi is in the application later when delving into the architecture. 

**Boom** is used to generate HTTP-friendly error objects. It is used explicitly a few places to generate a particular error-response. Most importantly, it is used internally by Hapi and all uncaught errors in route-handlers will result in a Boom-object with a 500-statuscode.
It's also worth mentioning the custom Error-mapper-plugin, which tries to map uncaught database errors to the respective HTTP-statuscode. For instance, when postgres encounters a unique violation, the plugin will run after the handler (hooking into the `onPreResponse` lifecycle-method`), mapping this to a 409-conflict HTTP-error. This means that most of the time we do not need to explicitly check for constraint violations, not found errors etc, and can thus return the db-query directly.

**Bounce** is a simple library that makes it easy to rethrow syntax errors. When using `async/await` application errors and developer errors like syntax-errors are combined into one "channel", and without selective exception catching in javascript it can be quite annoying to debug if you've caught an error without logging it. So we use `Bounce.rethrow(error, 'system') to rethrow such developer errors, while safely ignoring expected application errors.

**Knex** is a lightweight sql-builder that also handles migrations and seeding of the database. All database changes are written as migrations. Use `knex migrate:make name` to create a new migration. The server will try to migrate to the latest version on startup.
It was decided that we were not going to use an ORM for database-entities. Knex is a good fit as it's very bare-bones, and thus we handle all the database logic ourself. 

The API is a bit weird, as it coerces the builder object to a promise when `query.then()` (or `await query`) is called. It is not executed intil one of those are called.

## Architecture 

### Architecture v1

When delving into the code you might notice that there are quite some differences between API v1-routes and v2-routes. This is due to an effort to improve the code-quality and architecture of the code for v2-routes. 

Again, v1 was started to mirror the old Java- API, and was written pretty "straight forward" with the goal of having a version that works. While most of the DB-queries are handled in their own function (in the `data`-folder), handlers grew quite big and we were having problems and bugs with transactions not being closed properly etc. It was a mess to deal with multiple transactions within a handler of hundreds of lines.

This sparked an effort to design a more cohesive and generalized way to handle DB-operations.

### Towards v2

The main problems that we wanted to solve was the problem with messy transactions and composability of operations. We also wanted a better way to handle transformation/formatting of data between the database and application code. 

It turns out that the transaction-object in the callback of `knex.transaction(trx => {})` can be used in the exact same way as the bound `knex`-object and  will then run the query in that transaction. More importantly: knex will automatically rollback any changes to the database if that callback throws an error. This meant that we could easily compose seperate operations without messy catch-handlers with `rollback()`s scattered everywhere.

This resulted in a `service`-like architecture. Note that nothing here is set in stone and very much subject to change, and any feedback is very welcome. 

#### Services and models 

A `Service` is a module which exports functions that encapsulate CRUD-operations on an entity (like Organisation or User). Most of the time, a service should be paired with a `Model`. In it's core a `Model` is basically a `Joi-schema` that describes a particular entity, eg. an Organisation or an User. Joi-schemas are immutable, and can be "extended" using the [append() or keys()](https://joi.dev/api/?v=17.3.0#objectappendschema) method, so we have a [Default](./server/src/models/v2/Default.js)-model that describes properties shared by all entities. 

All service-functions take a `knex`-parameters as the final parameter. This can be either a bound `knex`-instance, or a `transaction`-object from `knex.transaction()`, as mentioned above these can be used interchangeably. A service-function should always take and return internal data-structures, it's up to the function to transform the results from a query to interal structure. These functions are pretty similar to the old architecture's `data`-functions. However they are a bit more structured and composable. They are also easily integrated as [service-methods](https://hapi.dev/api/?v=20.0.1#server.methods), and thus cacheable.

The `Model`-module exports Joi-schema definitions, along with functions `parseDatabaseJson` and `formatDatabaseJson`. The idea is that we have at least two definitions; database-definition and internal-definition. We could also have a third one for external schemas, but this should be mostly the same as the internal one as there is no need to complicate it further. These definitions can be used in any [hapi-validate](https://hapi.dev/api/?v=20.0.1#-routeoptionsvalidate)-function. The idea is that you use all the Joi-goodness for usecases like restricting and renames of keys. For instance `definition.without('sensitive')`. `Joi.alter()` can be used to group such transformations for a particular alteration, see [tailor()](https://joi.dev/api/?v=17.3.0#anytailortargets). 

`parseDatabaseJson()` is meant to be a function that can be overriden for more specific transformations, and will be called with the result of a database-query and is meant to return the data for internal application use. `formatDatabaseJson` is the opposite - it takes data from the application and transforms it to database-friendly objects.


Many would think that services and the models should be classes, and I've been a bit back and forth. I'm deliberately not using classes unless it's needed, and most of the time that means when you need state. Up to now these do not need state, but it could make sense to have a base-class that lays out the structure of these modules. But classes needs to instantiated, and that would mean bootstrapping the services on startup which is annoying in itself, and the methods would also not be statically available. [Schmervice](https://github.com/hapipal/schmervice) is also something we could consider.

#### Plugins

Plugins are essential to the Hapi-ecosystem, but they are not just for sharing generic code across projects. They are great when you want to encapsulate logic that should run across routes during the [request lifecycle](https://hapi.dev/api/?v=20.0.1#request-lifecycle), even just for internal use.

