# Week 2 — Distributed Tracing
## Insrumenting Honeycomb for Flask
- Started by first logging into my honeycomb account.
- Created Environment and copied API keys.

![honeycomb_api_creation](./assets/honeycomb-api.png)


- Added API keys to Environment Variable in my Cloud Environment.
```
export HONEYCOMB_API_KEY=""
gp env HONEYCOMB_API_KEY=""
export HONEYCOMB_SERVICE_NAME="Cruddur"
gp env HONEYCOMB_SERVICE_NAME="Cruddur"
```
- Configured Open Telemetry(OTEL) service, endpoint and headers into backend-flask.
```
OTEL_EXPORTER_OTLP_ENDPOINT: "https://api.honeycomb.io"
OTEL_EXPORTER_OTLP_HEADERS: "x-honeycomb-team=${HONEYCOMB_API_KEY}"
OTEL_SERVICE_NAME: "${HONEYCOMB_SERVICE_NAME}"
```

- Installed packages to instrument a Flask app with OpenTelemetry in the backend-flask. This is after adding the following files to my requirement.txt file:
```
opentelemetry-api 
opentelemetry-sdk 
opentelemetry-exporter-otlp-proto-http 
opentelemetry-instrumentation-flask 
opentelemetry-instrumentation-requests
```
Then installed the files using:
`pip install -r requirements.txt`

- Initialized the flask app with OpenTelemetry by copying and pasting the following codes in my `app.py` file:
```
from opentelemetry import trace
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
```

```
# Initialize tracing and an exporter that can send data to Honeycomb
provider = TracerProvider()
processor = BatchSpanProcessor(OTLPSpanExporter())
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer(__name__)
```

```
# Initialize automatic instrumentation with Flask
app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()
```
- Ran docker compose up, but it still didnt send any data to honeycomb. So created spans by Acquiring Tracer and Creating Spans codes from Honecomb.io Documentation from their website to my home_activities.py file in services folder of the backend-flask and data was then sent to honeycomb. 

![honeycomb_send_data](./assets/honeycomb-dataset.png)

- Created custom spans by copying and adding codes to home_activities.py from Creating Spans in Honeycomb.io Documentation.

![custom_pan_app_now](./assets/app-now.png)

# X-Ray

### Instrument AWS X-Ray for Flask
- Installed AWS Xray by first adding `aws-xray-sdk` to the requirements.txt file in the backend-flask and then installed using `pip install -r requirments.txt`.
- Copied and added AWS import and middleware codes to `app.py` file:
```
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.ext.flask.middleware import XRayMiddleware

xray_url = os.getenv("AWS_XRAY_URL")
xray_recorder.configure(service='backend-flask', dynamic_naming=xray_url)
XRayMiddleware(app, xray_recorder)
```
### Setup AWS X-Ray Resources

Added xray.json file to the aws/json folder
```
{
  "SamplingRule": {
      "RuleName": "Cruddur",
      "ResourceARN": "*",
      "Priority": 9000,
      "FixedRate": 0.1,
      "ReservoirSize": 5,
      "ServiceName": "backend-flask",
      "ServiceType": "*",
      "Host": "*",
      "HTTPMethod": "*",
      "URLPath": "*",
      "Version": 1
  }
}
```
- Created an AWS xray group using:
```
aws xray create-group \
   --group-name "Cruddur" \
   --filter-expression "service(\"$backend-flask\")"
   ```
- Created AWS Sampling:
`aws xray create-sampling-rule --cli-input-json file://aws/json/xray.json`

![create_aws_sampling_rule](./assets/aws-sampling-rule.png)

### Installing X-ray Daemon
Did this by adding the following to the docker compose file:

### Add Deamon Service to Docker Compose
```
  xray-daemon:
    image: "amazon/aws-xray-daemon"
    environment:
      AWS_ACCESS_KEY_ID: "${AWS_ACCESS_KEY_ID}"
      AWS_SECRET_ACCESS_KEY: "${AWS_SECRET_ACCESS_KEY}"
      AWS_REGION: "us-east-1"
    command:
      - "xray -o -b xray-daemon:2000"
    ports:
      - 2000:2000/udp
  ```    
  - Added the following Environment Variables to the backend-flask in my docker compose file:
  ```
        AWS_XRAY_URL: "*4567-${GITPOD_WORKSPACE_ID}.${GITPOD_WORKSPACE_CLUSTER_HOST}*"
      AWS_XRAY_DAEMON_ADDRESS: "xray-daemon:2000"
  ```
  - Ran docker compose up and AWS Xray worked because data was sent to AWS.

![aws_dataset](./assets/aws-xray-output.png)

### Adding custom segment/subsegment
Added a segment/subsgment codes to `user_activities.py` file in the services folder of the backend-flask:
```
subsegment.put_metadata('key', dict, 'namespace')
    # xray ---
    dict = {
      "now": now.isoformat(),
      "results-size": len(model['data'])
    }
    subsegment.put_metadata('key', dict, 'namespace')
   ```
   #  CloudWatch Logs
   Added to the requirements.txt in the backend-flask:
   ```  
   watchtower
   ```
  Then installed watchtower using:
  
  `pip install -r requirements.txt`
  
  Added in `app.py`:
  ```
  import watchtower
  import logging
  from time import strftime
  ```
  ```
  # Configuring Logger to Use CloudWatch
  LOGGER = logging.getLogger(__name__)
  LOGGER.setLevel(logging.DEBUG)
  console_handler = logging.StreamHandler()
  cw_handler = watchtower.CloudWatchLogHandler(log_group='cruddur')
  LOGGER.addHandler(console_handler)
  LOGGER.addHandler(cw_handler)
  LOGGER.info("test_log")
  ```
  ```
  @app.after_request
  def after_request(response):
      timestamp = strftime('[%Y-%b-%d %H:%M]')
      LOGGER.error('%s %s %s %s %s %s', timestamp, request.remote_addr, request.method, request.scheme, request.full_path, response.status)
      return response
  ```
  Added to `home_activities.py`:
  
  `LOGGER.info("HomeActivities")`
  
 I set Environment Variables in the backend-flask in the `docker-compose.yml` file:
 ```
 AWS_DEFAULT_REGION: "${AWS_DEFAULT_REGION}"
 AWS_ACCESS_KEY_ID: "${AWS_ACCESS_KEY_ID}"
 AWS_SECRET_ACCESS_KEY: "${AWS_SECRET_ACCESS_KEY}"
 ```
 Ran docker compose up and it worked, data was sent to AWS CloudWatch
 
 ![aws_cloudwatch](./assets/aws-log-streams.png)
 
 ![aws_cloudwatch](./assets/aws-log-event.png)
 
 # Rollbar
- I added to `requirements.txt` file:
 ```
 blinker
 rollbar
 ```
- Installed the dependencies using:
 
 `pip install -r requirements.txt`
 
- Set Rollbar access token in my Environment Variables
 ```
 export ROLLBAR_ACCESS_TOKEN=""
 gp env ROLLBAR_ACCESS_TOKEN=""
 ```
- Added to `aap.py` file:
```
import rollbar
import rollbar.contrib.flask
from flask import got_request_exception
```

```
rollbar_access_token = os.getenv('ROLLBAR_ACCESS_TOKEN')
@app.before_first_request
def init_rollbar():
    """init rollbar module"""
    rollbar.init(
        # access token
        rollbar_access_token,
        # environment name
        'production',
        # server root directory, makes tracebacks prettier
        root=os.path.dirname(os.path.realpath(__file__)),
        # flask already sets up logging
        allow_logging_basic_config=False)

    # send exceptions from `app` to rollbar, using flask's signal system.
    got_request_exception.connect(rollbar.contrib.flask.report_exception, app)
   ```
   - Added an endpoint just for testing rollbar to app.py 
   ```
   @app.route('/rollbar/test')
   def rollbar_test():
       rollbar.report_message('Hello World!', 'warning')
       return "Hello World!"
   ```
   - Ran docker compose up and it worked, data was sent to Rollbar.

  ![rollbar](./assets/rollbar.png)

  

      
      

