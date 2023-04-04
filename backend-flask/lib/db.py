import os
from psycopg_pool import ConnectionPool


connection_url = os.getenv("CONNECTION_URL")
pool = ConnectionPool(connection_url)