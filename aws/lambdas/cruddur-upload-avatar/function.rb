require 'aws-sdk-s3'
require 'json'
require 'aws-sdk-ssm'
require 'jwt'

def handler(event:, context:)
  # Create an AWS SSM client
  ssm_client = Aws::SSM::Client.new
  # Retrieve the value of an environment variable from SSM Parameter Store
  response = ssm_client.get_parameter({
    name: '/cruddur/CruddurAvatarUpload/LAMBDA_FRONTEND',
    with_decryption: true
  })
  # Access the environment variable value
  frontend_url = response.parameter.value
  puts frontend_url

  puts event
  # Return CORS headers for preflight check
  if event['routeKey'] == "OPTIONS /{prefix+}"
    puts({ step: 'preflight', message: 'preflight CORS check' }.to_json)
    {
      headers: {
        "Access-Control-Allow-Headers": "*, Authorization",
        "Access-Control-Allow-Origin": frontend_url,
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST"
      },
      statusCode: 200,
    }
  else
    token = event['headers']['authorization'].split(' ')[1]
    puts({ step: 'presigned url', access_token: token }.to_json)

    body_hash = JSON.parse(event["body"])
    extension = body_hash["extension"]

    decoded_token = JWT.decode token, nil, false
    cognito_user_uuid = decoded_token[0]['sub']
    #cognito_user_uuid = event["requestContext"]["authorizer"]["lambda"]["sub"]

    puts({step:'presign url', sub_value: cognito_user_uuid}.to_json)

    s3 = Aws::S3::Resource.new
    bucket_name = ENV["UPLOADS_BUCKET_NAME"]
    object_key = "#{cognito_user_uuid}.#{extension}"

    puts({object_key: object_key}.to_json)

    obj = s3.bucket(bucket_name).object(object_key)
    url = obj.presigned_url(:put, expires_in: 60 * 5)
    url # this is the data that will be returned
    
    body = {url: url}.to_json
    { 
      headers: {
        "Access-Control-Allow-Headers": "*, Authorization",
        "Access-Control-Allow-Origin": frontend_url,
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST"
      },
      statusCode: 200, 
      body: body 
    }
  end # if 
end # def handler

     

# #use for debugging
# puts handler(
#   event: {},
#   context: {}
# )
