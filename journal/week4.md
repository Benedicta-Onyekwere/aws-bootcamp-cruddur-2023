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
### Shell Script to Connect to DB
- Created and exported a Connection Url string which is a way of providing all the details it needs to authenticate to a server.
```
postgresql://[user[:password]@][netloc][:port][/dbname][?param1=value1&...]

export CONNECTION_URL="postgresql://postgres:password@127.0.0.1:5432/cruddur"
gp env CONNECTION_URL="postgresql://postgres:pssword@127.0.0.1:5432/cruddur"
```
- Created a `bin` folder that contain all my bashscripts such as `db-create, db-drop, db-schema-load` etc.
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

- Checked db-connect to see the connections using `./bin/db-connect` and got :
```
cruddur=# \x on
Expanded display is on.
cruddur=# SELECT * FROM activities;
-[ RECORD 1 ]----------+-------------------------------------
uuid                   | ecd57d7a-e832-4440-b532-9c51aea10498
user_uuid              | a05119b3-658f-4925-a5bc-0e31811d7b17
message                | This was imported as seed data!
replies_count          | 0
reposts_count          | 0
likes_count            | 0
reply_to_activity_uuid | 
expires_at             | 2023-04-14 01:34:31.392765
created_at             | 2023-04-04 01:34:31.392765
```
### See what connections I am using
- Created a file `db-sessions` in `bin` folder and added this code to it;
```
#! /usr/bin/bash 

CYAN='\033[1;36m'
NO_COLOR='\033[0m'
LABEL="db-sessions"
printf "${CYAN}== ${LABEL}${NO_COLOR}\n"

if [ "$1" = "prod" ]; then
  echo "Running in production mode"
  URL=$PROD_CONNECTION_URL
else
  URL=$CONNECTION_URL
fi

NO_DB_URL=$(sed 's/\/cruddur//g' <<<"$URL")
psql $NO_DB_URL -c "select pid as process_id, \
       usename as user,  \
       datname as db, \
       client_addr, \
       application_name as app,\
       state \
from pg_stat_activity;"
```
- Made it executable using; chmod u+x ./bin/db-sessions and got;
```
$  ./bin/db-sessions
== db-sessions
 process_id |   user   |    db    | client_addr | app  | state  
------------+----------+----------+-------------+------+--------
         25 |          |          |             |      | 
         27 | postgres |          |             |      | 
        196 | postgres | postgres | 172.18.0.1  | psql | active
         23 |          |          |             |      | 
         22 |          |          |             |      | 
         24 |          |          |             |      | 
(6 rows)
```
### Shell script to easily setup (reset) everything for the databases
- Created a new file `db-setup` still in the `bin` folder where all the database bashscripts I created are and can be executed at once instead of repeated doing it individually when needed:
```
#! usr/bin/bash
-e # stop if it fails at any point

#echo "==== db-setup"

bin_path="$(realpath .)/bin"

source "$bin_path/db-drop"
source "$bin_path/db-create"
source "$bin_path/db-schema-load"
source "$bin_path/db-seed"
```
-  Made it executable using; chmod u+x ./bin/db-setup and got:

 ![image](https://user-images.githubusercontent.com/105982108/229690457-f61a32cb-b4a8-413a-aedc-45f4da8a3251.png)
 
 - Added Postgres python driver which is a means to connect to postgres client to `requirements.txt` file in the backend-flask.
```
psycopg[binary]
psycopg[pool]
```
- Installed it using:
```
pip install -r requirements.txt
```
https://www.psycopg.org/psycopg3/
### DB Object and Connection Pool
- Created a Connection Pool by creating a `db.py` file in the `lib` folder of the backend-flask and added:
```
from psycopg_pool import ConnectionPool
import os

def query_wrap_object(template):
  sql = f"""
  (SELECT COALESCE(row_to_json(object_row),'{{}}'::json) FROM (
  {template}
  ) object_row);
  """
  return sql

def query_wrap_array(template):
  sql = f"""
  (SELECT COALESCE(array_to_json(array_agg(row_to_json(array_row))),'[]'::json) FROM (
  {template}
  ) array_row);
  """
  return sql

connection_url = os.getenv("CONNECTION_URL")
pool = ConnectionPool(connection_url)


```
- Added the Conection URL to Env Vars in my docker compose file:
```
 CONNECTION_URL: "postgresql://postgres:password@127.0.0.1:5432/cruddur"
 CONNECTION_URL: "postgresql://postgres:password@db:5432/cruddur"
 ```
 - Added the following to the `home_activities.py` file:
```
from datetime import datetime, timedelta, timezone
from opentelemetry import trace
from lib.db import pool, query_wrap_object, query_wrap_array
tracer = trace.get_tracer("home.activities")
class HomeActivities:
  def run(cognito_user_id=None):
    print("HOME ACTIVITY")
    #logger.info("HomeActivities")
    with tracer.start_as_current_span("home-activites-mock-data"):
      span = trace.get_current_span()
      now = datetime.now(timezone.utc).astimezone()
      span.set_attribute("app.now", now.isoformat())
      sql = query_wrap_array("""
      SELECT
        activities.uuid,
        activities.user_uuid,
        users.display_name,
        users.handle,
        activities.message,
        activities.replies_count,
        activities.reposts_count,
        activities.likes_count,
        activities.reply_to_activity_uuid,
        activities.expires_at,
        activities.created_at,
        activities.created_at
      FROM public.activities
      ORDER BY activities.id
      LEFT JOIN public.users ON users.uuid = activities.user_uuid
      ORDER BY activities.created_at DESC
      """)
      print("########==========")
      print(sql)
      with pool.connection() as conn:
        conn.execute(sql)
        json = con.fetchone()
        print(json)

      span.set_attribute("app.result_length", len(results))
      return results
        with conn.cursor() as cur:
          cur.execute(sql)
          # this will return a tuple
          # the first field being the data
          json = cur.fetchone()
      return json[0]
      ```






































































