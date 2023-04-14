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
- Added the Conection URL to Env Vars in my docker compose file but commented the initial one because in the backend-flask shell it only recognised the other, hence used it otherwise will keep getting error connection pool -1:
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
        users.display_name,
        users.handle,
        activities.message,
        activities.replies_count,
        activities.reposts_count,
        activities.likes_count,
        activities.reply_to_activity_uuid,
        activities.expires_at,
        activities.created_at
      FROM public.activities
      LEFT JOIN public.users ON users.uuid = activities.user_uuid
      ORDER BY activities.created_at DESC
      """)
      print("########==========")
      print(sql)
      with pool.connection() as conn:
        with conn.cursor() as cur:
          cur.execute(sql)
          # this will return a tuple
          # the first field being the data
          json = cur.fetchone()
      return json[0]
  ```
- The query finally worked after all the debugging and manipulations.

![query_worked](./assets/cruddur-query.png)

![aws_rds_instance](./assets/aws-rds.png)

- Then re-started my AWS RDS instance and it showed available which means it worked and also echoed the endpoint on my terminal and it also worked.

### Connect to RDS via Gitpod
- In order to connect my AWS RDS instance to my gitpod, i needed to get my gitpod Ip address in order to add it to the inbound traafic on port 5432 for postgesql and i did that using:
```
GITPOD_IP=$(curl ifconfig.me)
```
- Created an inbound rule for Postgres (5432) and provided the GITPOD ID.
- Got the security group rule id and added it to my Environment variables so it can easily be modified in the future from the terminal here in Gitpod.
```
export DB_SG_ID=sg-063517d50c666c42e
gp env DB_SG_ID=sg-063517d50c666c42e
export DB_SG_RULE_ID=sgr-0e581d11f2f1feff9 
gp env DB_SG_RULE_ID=sgr-0e581d11f2f1feff9
```
- Whenever security groups needs to be updated, the folowing command can be used for access:
```
aws ec2 modify-security-group-rules \
    --group-id $DB_SG_ID \
    --security-group-rules "SecurityGroupRuleId=$DB_SG_RULE_ID,SecurityGroupRule={IpProtocol=tcp,FromPort=5432,ToPort=5432,CidrIpv4=$GITPOD_IP/32}"
```
### Test remote access
- To do this i created a connection url
```
postgresql://root:cruddurdbpassword@cruddur-db-instance.cywysqjvjxra.us-east-1.rds.amazonaws.com:5432/cruddur
```
- Tested it to see that it works using:
```
psql postgresql://root:cruddurdbpassword@cruddur-db-instance.cywysqjvjxra.us-east-1.rds.amazonaws.com:5432/cruddur
```
- It worked, then add it to my Environment variables in order to update the URL for production use case using:
```
export PROD_CONNECTION_URL=postgresql://root:cruddurdbpassword@cruddur-db-instance.cywysqjvjxra.us-east-1.rds.amazonaws.com:5432/cruddur
gp env PROD_CONNECTION_URL=postgresql://root:cruddurdbpassword@cruddur-db-instance.cywysqjvjxra.us-east-1.rds.amazonaws.com:5432/cruddur
```
- Updated `db-connect` and `db-schema-load` bash scripts.
- Updated Gitpod IP on new Environment variable:
```
    command: |
      export GITPOD_IP=$(curl ifconfig.me)
      source "$THEIA_WORKSPACE_ROOT/backend-flask/db-update-sg-rule"
```

### Setup Cognito Post Confirmation Lambda
#### Created the handler function
- By first creating lambda cruddur post confirmation the in same VPC as my RDS instance Python 3.8
- Created a lambdas folder and added the function into a file `cruddur-post-confirmation.py` still in the backend-flask.
- Updated my `schema.sql`file.
```
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.activities;


CREATE TABLE public.users (
  uuid UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  display_name text NOT NULL,
  handle text NOT NULL,
  email text NOT NULL,
  cognito_user_id text NOT NULL,
  created_at TIMESTAMP default current_timestamp NOT NULL
);

CREATE TABLE public.activities (
  uuid UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_uuid UUID NOT NULL,
  message text NOT NULL,
  replies_count integer DEFAULT 0,
  reposts_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  reply_to_activity_uuid integer,
  expires_at TIMESTAMP,
  created_at TIMESTAMP default current_timestamp NOT NULL
);
```
- Copied, pasted and saved the function in lambda.
The Function
```
import json
import psycopg2
import os

def lambda_handler(event, context):
    user = event['request']['userAttributes']
    print('userAttributes')
    print(user)

    user_display_name  = user['name']
    user_email         = user['email']
    user_handle        = user['preferred_username']
    user_cognito_id    = user['sub']
    try:
      print('entered-try')
      sql = f"""
         INSERT INTO public.users (
          display_name, 
          email,
          handle, 
          cognito_user_id
          ) 
        VALUES(
          '{user_display_name}', 
          '{user_email}', 
          '{user_handle}', 
          '{user_cognito_id}'
        )
      """
      print('SQL Statement ----')
      print(sql)
      conn = psycopg2.connect(os.getenv('CONNECTION_URL'))
      cur = conn.cursor()
      cur.execute(sql)
      conn.commit() 

    except (Exception, psycopg2.DatabaseError) as error:
      print(error)
    finally:
      if conn is not None:
          cur.close()
          conn.close()
          print('Database connection closed.')
    return event

```

![aws_lambda](./assets/lambda-function.png)

- Added the CONNECTION URL that of the Prod precisely to the Lambda Environment variables:
```
CONNECTION_URL=postgresql://root:cruddurdbpassword@cruddur-db-instance.cywysqjvjxra.us-east-1.rds.amazonaws.com:5432/cruddur
```
- Added a layer for psycopg2 with one of the precompiled versions of this layer are available publicly on AWS freely to add to my function by ARN reference.
```
arn:aws:lambda:us-east-1:898466741470:layer:psycopg2-py38:2
```
- Added the Post confirmation Lambda trigger to Lambda triggers in Cognito cruddur pool user in the user pool properties which will cause a trigger whenever i sign up on cruddur.
- To monitor events on my RDS instance i check the logs and events which has CloudWatch which is what i used in monitoring my event.
- Made sure there were no users in Cognito before going to trigger it by signing up in cruddur homepage, didnt work got error "User cannot be confirmed. Current status is Confirmed" and later a Connection error due to lambda not being attached to the default VPC of the RDS instance.
- To attach this clicked on configuration, permission to create an IAM role policy for an ec2, clicked on attach, used the one for AWSLAMBDAVPCEXECUTIONROLE  
- Created and attached the policy, added the policy permission.
- In the lambda clicked on Configuration and then VPC added my default with the security group, saved and refreshed the Lambda and it was attached.
- Deleted users again in cognito, signed up got cofirmation code confirmed and it worked took me straight to the homepage, checked to see if the connection truly worked by checking the `db-connect prod` to see if the user was created. I had an error of "Did not findny relations", checked my CloudWatch gave an error "public.users does not exist".
- After much debugging and combing through my files found out I mistakenly omitted quotation marks in the schema path in the `schema-load` file and after making the correction everything worked. 

  
![cruddur](./assets/cruddur-confirmation.png)



![aws cloudwatch](./assets/cloudwatch-log.png)




![image](https://user-images.githubusercontent.com/105982108/231618949-252d1094-997e-4970-a2ae-a9e52e5360c6.png)


# Create Activities
- Updated `db.py` file in the backend-flask/lib with:
```
class Db:
  def __init__(self):
    self.init_pool()

  def init_pool(self):
    connection_url = os.getenv("CONNECTION_URL")
    self.pool = ConnectionPool(connection_url)
  # we want to commit data such as an insert
  def query_commit(self):
    try:
      conn = self.pool.connection()
      cur =  conn.cursor()
      cur.execute(sql)
      conn.commit() 
    except Exception as err:
      self.print_sql_err(err)
      #conn.rollback()
  # when we want to return a json object
  def query_array_json(self,sql):
    print("SQL STATEMENT-[array]------")
    print(sql + "\n")
    wrapped_sql = self.query_wrap_array(sql)
    with self.pool.connection() as conn:
      with conn.cursor() as cur:
        cur.execute(wrapped_sql)
        json = cur.fetchone()
        return json[0]
  # When we want to return an array of json objects
  def query_object_json(self,sql):
    print("SQL STATEMENT-[object]-----")
    print(sql + "\n")
    wrapped_sql = self.query_wrap_object(sql)
    with self.pool.connection() as conn:
      with conn.cursor() as cur:
        cur.execute(wrapped_sql)
        json = cur.fetchone()
        return json[0]

  def query_wrap_object(self,template):
    sql = f"""
    (SELECT COALESCE(row_to_json(object_row),'{{}}'::json) FROM (
    {template}
    ) object_row);
    """
    return sql
  def query_wrap_array(self,template):
    sql = f"""
    (SELECT COALESCE(array_to_json(array_agg(row_to_json(array_row))),'[]'::json) FROM (
    {template}
    ) array_row);
    """
    return sql
  def print_sql_err(self,err):
    # get details about the exception
    err_type, err_obj, traceback = sys.exc_info()

    # get the line number when exception occured
    line_num = traceback.tb_lineno

    # print the connect() error
    print ("\npsycopg ERROR:", err, "on line number:", line_num)
    print ("psycopg traceback:", traceback, "-- type:", err_type)

    # psycopg2 extensions.Diagnostics object attribute
    print ("\nextensions.Diagnostics:", err.diag)

    # print the pgcode and pgerror exceptions
    print ("pgerror:", err.pgerror)
    print ("pgcode:", err.pgcode, "\n")

db = Db()
```

- Also updated `create_activity.py` and `home_activity.py` files in the backend-flask/services respectively with :
```
# create_activity.py

import uuid
from datetime import datetime, timedelta, timezone

# from lib.db import db

class CreateActivity:
  def run(message, user_handle, ttl):
    model = {
      'errors': None,
      'data': None
    }

    now = datetime.now(timezone.utc).astimezone()

    if (ttl == '30-days'):
      ttl_offset = timedelta(days=30) 
    elif (ttl == '7-days'):
      ttl_offset = timedelta(days=7) 
    elif (ttl == '3-days'):
      ttl_offset = timedelta(days=3) 
    elif (ttl == '1-day'):
      ttl_offset = timedelta(days=1) 
    elif (ttl == '12-hours'):
      ttl_offset = timedelta(hours=12) 
    elif (ttl == '3-hours'):
      ttl_offset = timedelta(hours=3) 
    elif (ttl == '1-hour'):
      ttl_offset = timedelta(hours=1) 
    else:
      model['errors'] = ['ttl_blank']

    if user_handle == None or len(user_handle) < 1:
      model['errors'] = ['user_handle_blank']

    if message == None or len(message) < 1:
      model['errors'] = ['message_blank'] 
    elif len(message) > 280:
      model['errors'] = ['message_exceed_max_chars'] 

    if model['errors']:
      model['data'] = {
        'handle':  user_handle,
        'message': message
      }   
    else:
      self.create_activity()
      model['data'] = {
        'uuid': uuid.uuid4(),
        'display_name': 'Andrew Brown',
        'handle':  user_handle,
        'message': message,
        'created_at': now.isoformat(),
        'expires_at': (now + ttl_offset).isoformat()
      }
    return model
  def create_activity(user_uuid, message, expires_at):
    sql = f"""
    INSERT INTO (
      user_uuid,
      message,
      expires_at
    )
    VALUES (
      "{user_uuid}",
      "{message}",
      "{expires_at}"
    )
    """
    #query_commit(sql)
```

```
# create home_activity.py

from datetime import datetime, timedelta, timezone
from opentelemetry import trace

from lib.db import db

#tracer = trace.get_tracer("home.activities")

class HomeActivities:
  def run(cognito_user_id=None):
    #logger.info("HomeActivities")
    #with tracer.start_as_current_span("home-activites-mock-data"):
    #  span = trace.get_current_span()
    #  now = datetime.now(timezone.utc).astimezone()
    #  span.set_attribute("app.now", now.isoformat())
        sql = db.template('activities','home')
    results = db.query_array_json(sql)
    return results
```
- Created in `db` folder an `sql` folder and within it an activities folder in which the different activities where now put in different files namely: `create.sql`, `home.sql`, and `object.sql`
```
# create.sql

INSERT INTO public.activities (
  user_uuid,
  message,
  expires_at
)
VALUES (
  (SELECT uuid 
    FROM public.users 
    WHERE users.handle = %(handle)s
    LIMIT 1
  ),
  %(message)s,
  %(expires_at)s
) RETURNING uuid;
```
```
# home.sql

SELECT
  activities.uuid,
  users.display_name,
  users.handle,
  activities.message,
  activities.replies_count,
  activities.reposts_count,
  activities.likes_count,
  activities.reply_to_activity_uuid,
  activities.expires_at,
  activities.created_at
FROM public.activities
LEFT JOIN public.users ON users.uuid = activities.user_uuid
```
```
# object.sql

SELECT
  activities.uuid,
  users.display_name,
  users.handle,
  activities.message,
  activities.created_at,
  activities.expires_at
FROM public.activities
INNER JOIN public.users ON users.uuid = activities.user_uuid 
WHERE 
  activities.uuid = %(uuid)s
```
- Then updated the `cruddur-cofirmation-post.py` and added and saved it to lambda to avoid having sql injection because if it has it people can read and write anything in the database:
```
import json
import psycopg2
import os


def lambda_handler(event, context):
    user = event['request']['userAttributes']
    user_display_name = user['name']
    user_email = user['email']
    user_handle = user['preferred_username']
    user_cognito_id = user['sub']
    
    try:
        sql = """
            INSERT INTO public.users (
                display_name, 
                email,
                handle, 
                cognito_user_id
            ) 
            VALUES (%s, %s, %s, %s)
        """
        
        params = [
            user_display_name,
            user_email,
            user_handle,
            user_cognito_id
        ]
        
        with psycopg2.connect(os.getenv('CONNECTION_URL')) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
            conn.commit()

    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
    else:
        print("Data inserted successfully")
    finally:
        print('Database connection closed.')
    
    return event
```
- Signed into Cruddur and posted a crud, didnt work kept getting error `'NotNullViolation' object has no attribute 'pgerror'`until i updated the following: `cruddur-cofirmation-post.py` as shown above, 
 The ActivityForm component in pages/HomeFeedPage.js to pass the user_handle prop as follows:
```
<ActivityForm
  user_handle={user}
  popped={popped}
  setPopped={setPopped}
  setActivities={setActivities}
/>
```

In the components/ActivityForm.js component, I updated the fetch request body to include the user_handle:
```
body: JSON.stringify({
  user_handle: props.user_handle.handle,
  message: message,
  ttl: ttl
}),
```

In app.py, under the /api/activities route, I assigned the user_handle variable as follows:
```
@app.route("/api/activities", methods=['POST','OPTIONS'])
@cross_origin()
def data_activities():
  user_handle  = 'andrewbrown'
  user_handle  = request.json['user_handle']
  message = request.json['message']
  ttl = request.json['ttl']
  model = CreateActivity.run(message, user_handle, ttl)
```
- It finally worked.

![image](https://user-images.githubusercontent.com/105982108/231988056-1f3c3ac8-83c5-4264-9014-d04084872125.png)


- Confirmed it worked by checking if data dropped in the `PROD_CONNECTION_URL` and it did.

![image](https://user-images.githubusercontent.com/105982108/231959802-80b6c556-52fc-4a57-ac66-3f1a21a26ef4.png)

    





























































