import os
import urllib.parse

api_key = os.environ["HONEYCOMB_API_KEY"]
url_encoded_api_key = urllib.parse.quote(api_key)
header_value = f"x-honeycomb-team{url_encoded_api_key}"

os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = header_value
print(os.environ["OTEL_EXPORTER_OTLP_HEADERS"]) # this should print the URL encoded header value
