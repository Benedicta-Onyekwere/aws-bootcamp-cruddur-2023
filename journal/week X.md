# Week X - Cleanup

With our AWS Cloud Project Bootcamp coming to a close, Week X was created to cleanup our application and get most of the features into a working state.

[Sync Tool for Static Website Hosting](#Sync-Tool-for-Static-Website-Hosting)





### Sync Tool for Static Website Hosting

### Setting up frontend build

Create a new bash script  file `static-build` in the `bin/frontend` and made it executable.
```sh
#! /usr/bin/bash

ABS_PATH=$(readlink -f "$0")
FRONTEND_PATH=$(dirname $ABS_PATH)
BIN_PATH=$(dirname $FRONTEND_PATH)
PROJECT_PATH=$(dirname $BIN_PATH)
FRONTEND_REACT_JS_PATH="$PROJECT_PATH/frontend-react-js"

cd $FRONTEND_REACT_JS_PATH

REACT_APP_BACKEND_URL="https://api.bennieo.me" \
REACT_APP_AWS_PROJECT_REGION="$AWS_DEFAULT_REGION" \
REACT_APP_AWS_COGNITO_REGION="$AWS_DEFAULT_REGION" \
REACT_APP_AWS_USER_POOL_ID="us-east-1_nCzleL11X" \
REACT_APP_CLIENT_ID="6rvluth75jaeg605hblpdhqmbq" \
npm run build
```
Updated the following files in the `frontend-react-js/src/components`:
- `ActivityContent.css`
- `MessageGroupItem.css`
- `MessageItem.css`
- `ProfileHeading.css`
  
From
```sh
align-items: start;
```
With
```sh
align-items: flex-start;
```
- `DesktopNavigationLink.js`
  
Added
```sh
default:
break;
```
- `DesktoSidebar.js`
  
From
```sh
<a href="#">About</a>
<a href="#">Terms of Service</a>
<a href="#">Privacy Policy</a>
```
With
```sh
<a href="/about">About!</a>
<a href="/terms-of-service">Terms of Service</a>
<a href="/privacy-policy">Privacy Policy</a>
```
- `MessageForm.js`

From 
```sh
import { json, useParams } from 'react-router-dom';
```
With
```sh
import { useParams } from 'react-router-dom';
```


 






```sh
zip -r build.zip build/
```

```sh
gem install aws_s3_website_sync
```
```sh
gem install dotenv
```
