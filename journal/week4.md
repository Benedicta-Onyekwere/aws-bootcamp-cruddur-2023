# Week 4 — Postgres and RDS

### Provision RDS Instance
Started by provisioning an RDS instance using the following codes:
```
aws rds create-db-instance \
  --db-instance-identifier cruddur-db-instance \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version  14.6 \
  --master-username root \
  --master-user-password cruddurdbpassword \
  --allocated-storage 20 \
  --availability-zone us-east-1a \
  --backup-retention-period 0 \
  --port 5432 \
  --no-multi-az \
  --db-name cruddur \
  --storage-type gp2 \
  --publicly-accessible \
  --storage-encrypted \
  --enable-performance-insights \
  --performance-insights-retention-period 7 \
  --no-deletion-protection
  
  ```
  - After the RDS Instance was created, stopped it temporarily.
 
  ![aws_rds_instance](./assets/cruddur-db-instance.png)
  
  - Commented out starting dynamodb container in docker compose file and ran docker compose up to start up postgres.
  - Connected to postgres via the psql client cli tool using:
  ```
  psql -Upostgres --host localhost
  ```
  - Checked to see the databases using:
  `\l`
  - Then created a database within the PSQL client using:
  ```
  CREATE database cruddur;
  ```
  ```
  postgres=# create database cruddur;
CREATE DATABASE
postgres=# \l
                                 List of databases
   Name    |  Owner   | Encoding |  Collate   |   Ctype    |   Access privileges   
-----------+----------+----------+------------+------------+-----------------------
 cruddur   | postgres | UTF8     | en_US.utf8 | en_US.utf8 | 
 postgres  | postgres | UTF8     | en_US.utf8 | en_US.utf8 | 
 template0 | postgres | UTF8     | en_US.utf8 | en_US.utf8 | =c/postgres          +
           |          |          |            |            | postgres=CTc/postgres
 template1 | postgres | UTF8     | en_US.utf8 | en_US.utf8 | =c/postgres          +
           |          |          |            |            | postgres=CTc/postgres
(4 rows)

postgres=# 
```
### Import Script
- Created a folder in backend-flask  named`db` within which a file named `schema.sql` was created.
The command to import:
```
psql cruddur < db/schema.sql -h localhost -U postgres
```
### Add UUID Extension
- Added Universal Unique Identifier(UUID) code to the `schema.sql` file.
```
CREATE EXTENSION "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```
- Imported the script into the backend-flask using the import command shown above.
```
psql cruddur < db/schema.sql -h localhost -U postgres
Password for user postgres: 
CREATE EXTENSION
```
- Created and exported a Connection Url string which is a way of providing all the details it needs to authenticate to a server.
```
postgresql://[user[:password]@][netloc][:port][/dbname][?param1=value1&...]

export CONNECTION_URL="postgresql://postgres:password@127.0.0.1:5432/cruddur"
gp env CONNECTION_URL="postgresql://postgres:pssword@127.0.0.1:5432/cruddur"
```
- Create a `bin` folder and 3 files into it namely: `db-create, db-drop, db-schema-load` for bash scripting.
- Added shebang `#! /usr/bin/bash` to all the files since they dont have extensions.Shell script to drop the database
### Shell script to drop the database
- Added the following codes in the `bin/db-drop` file so that it can drop the database.
```
#! /usr/bin/bash 

echo "db-drop"

NO_DB_CONNECTION_URL $(sed 's/\/cruddur//g' <<< "$CONNECTION_URL")
psql $CONNECTION_URL -c "drop database cruddur;"
```
- Made the all the scripts executable at once without which they wont function using:
```
chmod -R u+x bin
```
- Then executed the script using `./bin/db-drop`.
### Shell script to create the database
- Added the following codes in the `bin/db-create` file to create the database
```
#! /usr/bin/bash

NO_DB_CONNECTION_URL=$(sed 's/\/cruddur//g' <<<"$CONNECTION_URL")
createdb cruddur $NO_DB_CONNECTION_URL
```
- Then executed the script using `./bin/db-create'.

### Shell script to load the schema
- Added the following codes in the `bin/db-schema-load` file to add color to the echo commmand, a conditional statement, show the real path in order to link it with the `schema.sql`file in the `db` folder and create an extension.
 ```
#! /usr/bin/bash 

#echo "== db-schema-load"
CYAN='\033[1;36m'
NO_COLOR='\033[0m'
LABEL="db-schema-load"
printf "${CYAN}== ${LABEL}${NO_COLOR}\n"

schema_path=$(realpath .)/db/schema.sql
echo $schema_path

if [ "$1" = "prod" ]; then
  echo "Running in production mode"
  URL=$PROD_CONNECTION_URL
else
  URL=$CONNECTION_URL
fi

psql $CONNECTION_URL cruddur < $schema_path
```
- Then executed the script using chmod u+x ./bin/db-schema-load.

![db_creation](./assets/bin-databases.png)

### Create tables
Did this by adding the following codes to `schema.sql` file:
```
#! /usr/bin/bash 

#echo "== db-seed-load"
CYAN='\033[1;36m'
NO_COLOR='\033[0m'
LABEL="db-seed-load"
printf "${CYAN}== ${LABEL}${NO_COLOR}\n"

seed_path=$(realpath .)/db/seed.sql
echo $seed_path

if [ "$1" = "prod" ]; then
  echo "Running in production mode"
  URL=$PROD_CONNECTION_URL
else
  URL=$CONNECTION_URL
fi

psql $CONNECTION_URL cruddur < $seed_path
```
### Shell script to load the seed data
- Added the following codes in the `bin/db-seed` file.
```
#! /usr/bin/bash 

#echo "== db-seed-load"
CYAN='\033[1;36m'
NO_COLOR='\033[0m'
LABEL="db-seed"
printf "${CYAN}== ${LABEL}${NO_COLOR}\n"

seed_path=$(realpath .)/db/seed.sql
echo $seed_path

if [ "$1" = "prod" ]; then
  echo "Running in production mode"
  URL=$PROD_CONNECTION_URL
else
  URL=$CONNECTION_URL
fi

psql $CONNECTION_URL cruddur < $seed_path
```
- Then executed the script using chmod u+x ./bin/db-seed.

![db_migrations](./assets/seed-database.png)









