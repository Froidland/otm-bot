# About the project
This project is a bot used for managing tournaments and tryouts made for [osu!](https://osu.ppy.sh/home). It consist of a discord bot made with [Sapphire](https://www.sapphirejs.dev/) that handles the discord side of things like creating the corresponding channels and roles, managing scheduling, sending reminders, etc; and a Bancho bot IRC client using [Bancho.js](https://bancho.js.org/) that handles lobby creation and automation.

It is currently in development and is **NOT** ready for production use. If you want to contribute, feel free to open a pull request or an issue.

# Requirements
In order to run the project, you need to have installed:

```
pnpm v8.9.2 or higher (earlier versions might work)
node v20.8.1 or higher (same as above)
```

[Node.js](https://nodejs.org/en/) can be obtained from [here](https://nodejs.org/en/download/) and [pnpm](https://pnpm.io/) can be installed after you've installed node by using the following command:

```sh
npm install -g pnpm
```

After having installed the above, you need to run the following commands in the root directory of the project:

```
pnpm install
npx prisma generate
```

`pnpm install` will install all the dependencies required for the project to run and `npx prisma generate` will generate the prisma client used for database access.

## External dependencies
The bot uses [MariaDB](https://mariadb.org/) and [Redis](https://redis.io/) as external dependencies. Make sure to have them installed and running before starting the bot.

If running on windows, MariaDB can be downloaded from [here](https://mariadb.org/download/?t=mariadb&p=mariadb&r=11.1.3&os=windows&cpu=x86_64&pkg=msi). Redis is not supported on windows but can be run using either [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) or [Docker](https://docs.docker.com/get-docker/). If using docker, it's as simple as running the following command:

```sh
docker run -d -p 6379:6379 redis
```

This will pull the latest redis image and run it on port 6379.

For Linux installations, you can follow Digital Ocean's [guide](https://www.digitalocean.com/community/tutorials/how-to-install-and-secure-redis-on-ubuntu-22-04) on how to install redis. They also have a [guide](https://www.digitalocean.com/community/tutorials/how-to-install-mariadb-on-ubuntu-22-04) for MariaDB.

## Environment variables
The bot uses environment variables to store sensitive information. You can find all the required variables in the [.env.example](.env.example) file, the lines starting with a `#` symbol are variables that are optional but it's recommended to fill them anyways. Make sure to create a `.env` file and fill it with the required information.

### Getting the discord credentials
In order to get the discord token, you need to create a new application in the [discord developer portal](https://discord.com/developers/applications). After creating the application, you can get the bot id from the general information tab, labeled as `Application ID`, and the bot token from the bot tab, labeled as `Token`. These correspond to the `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` variables.

### Getting the osu! credentials

You will need two types of credentials from osu!, the first one is the OAuth application and the second one is the IRC credentials. You can create the OAuth application [here](https://osu.ppy.sh/home/account/edit#oauth), make sure to set the redirect url to `http://localhost:5173/api/auth/login/osu/callback` for development if using the [default auth server](https://github.com/Froidland/otm-web).

You can get the client id and client secret from the OAuth application page, these go in the `OSU_CLIENT_ID` and `OSU_CLIENT_SECRET` variables.

The IRC credentials and the API key can be obtained from the [Legacy API](https://osu.ppy.sh/home/account/edit#legacy-api) section in your account settings. These correspond to the `BANCHO_USERNAME`, `BANCHO_PASSWORD` and `BANCHO_API_KEY` variables.

### Authentication server

The bot uses an authentication server to handle the OAuth flow, you can find the source code for the server [here](https://github.com/Froidland/otm-web). You can either make your own server or use the default one. Whichever you choose, you need to set the `FRONTEND_URL` and `FRONTEND_LOGIN_ROUTE` variables accordingly. You can find the example values in the [.env.example](.env.example) file.

## Setting up the database
The bot uses [Prisma](https://www.prisma.io/) as an ORM, this means that it can automatically create the database tables for you. To do this, you first need to create a database in your MariaDB instance, you can do this by running the following query:

```sql
CREATE DATABASE otm;
```

After having created the database, you can run the following command to create the tables:

```sh
npx prisma migrate deploy
```

You can read more about this command in the [official documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate/migrate-development-production).

**Note:** For development purposes, the user you use to connect to the database must have `CREATE`, `ALTER`, `DROP` and `REFERENCES ON *.*` privileges in order to create the tables. You can find more information about this [here](https://www.prisma.io/docs/concepts/components/prisma-migrate/shadow-database#shadow-database-user-permissions).

Another option, although not recommended, is to run the migrations manually. You can find the migrations in the [prisma/migrations](prisma/migrations) directory.

# Running the bot
After having installed all the dependencies and filled the environment variables, you can run the bot using the following command:

```sh
pnpm start
```

If everything was set up correctly, you should see something similar to the following output:

```log
2023-11-15 00:50:17 - INFO  - Logged in to osu! API.
2023-11-15 00:50:17 - INFO  - Logging in to Discord and Bancho...
2023-11-15 00:50:20 - INFO  - ApplicationCommandRegistries: Initializing...
2023-11-15 00:50:20 - INFO  - Logged in as OTM-DEV#5196
2023-11-15 00:50:20 - INFO  - ApplicationCommandRegistries: Took 3ms to initialize.
2023-11-15 00:50:21 - INFO  - Connected to Bancho as Pancho.
2023-11-15 00:50:21 - INFO  - Registering background jobs...
2023-11-15 00:50:22 - INFO  - Successfully registered background jobs.
2023-11-15 00:50:22 - INFO  - Starting background workers...
2023-11-15 00:50:22 - INFO  - Initialized tryout lobby reminder send worker.        
2023-11-15 00:50:22 - INFO  - Initialized tryout lobby reminder schedule worker.    
2023-11-15 00:50:22 - INFO  - Initialized tryout lobby create worker.
2023-11-15 00:50:22 - INFO  - Initialized tournament qualifier reminder send worker.
2023-11-15 00:50:22 - INFO  - Initialized tryout lobby reminder schedule worker.
2023-11-15 00:50:22 - INFO  - Initialized tournament qualifier create worker.
2023-11-15 00:50:22 - INFO  - Successfully started background workers.
```

For running the bot in development mode, you can use the following command:

```sh
pnpm dev
```

This will run the bot using Sapphire's [HMR](https://www.npmjs.com/package/@sapphire/plugin-hmr) plugin, which will automatically reload any commands or handlers that are changed. Additionally, this will also make the bot log debug information such as command registration, database queries and Bancho messages.
