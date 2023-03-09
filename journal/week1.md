# Week 1 — App Containerization

## Containerize Backend
This is done by running the following Python commands locally;
```
cd backend-flask
export FRONTEND_URL="*"
export BACKEND_URL="*"
python3 -m flask run --host=0.0.0.0 --port=4567
cd ..
```


Then I opened the link for port 4567 in a browser with /api/activities/home appended to it, where i got back the contents of the json file.

## Add Dockerfile
Started by creating a Dockerfile in the backend-flask that is backend-flask/Dockerfile and then copied and paste the following commands:
```
FROM python:3.10-slim-buster

# Inside Container
# Make a new folder inside
WORKDIR /backend-flask

# From outside container -> Inside container
# This contains libraries to be installed to run the app
COPY requirements.txt requirements.txt

# Inside Contianer
# Install the python libraries used for the app
RUN pip3 install -r requirements.txt

# Copy from outside container -> Inside
# . means everything in the current directory
# first period . -/backend-flask(outside container)
# second period . /backend-flask(inside container)
COPY . .

# Set Environment variables(Env Vars)
# Inside conatainer and will remain set when the container is run 
ENV FLASK_ENV=development


EXPOSE ${PORT}

# CMD(Command to run flask)
# python3 -m flask run --host=0.0.0 --port=4567
CMD [ "python3", "-m" , "flask", "run", "--host=0.0.0.0", "--port=4567"]
```

## Build Container
I ran the following command to create the image.

`docker build -t frontend-react-js ./frontend-react-js`

## Run Container
I ran the container using the command;

`docker run --rm -p 4567:4567 -it -e FRONTEND_URL='*' -e BACKEND_URL='*' backend-flask`

Run in background
To run container in the background while i can continue working, this command is used;

`docker container run --rm -p 4567:4567 -d backend-flask`


## Get Container Images or Running Container Ids
Then i ran the following commands to see the running process in the container and get the container Id and also to see the images that have been created as well.

`docker ps`

`docker images`


## Containerize Frontend
To do this i did the following;
- cd frontend-react-js
- Installed npm using the command npm i. Npm install has to be done before building the container since it needs to copy the contents of node_modules.
- Created a Dockerfile with the following contents;
```
FROM node:16.18

ENV PORT=3000

COPY . /frontend-react-js
WORKDIR /frontend-react-js
RUN npm install
EXPOSE ${PORT}
CMD ["npm", "start"]
```

- Ran the build and run commands respectively;

## Build Container

`docker build -t frontend-react-js ./frontend-react-js`

## Run Container

`docker run -p 3000:3000 -d frontend-react-js`
 
 ## Multiple Containers
 To orchestrate multiple containers that have to work together locally, a docker-compose file is used to achieve this.

Created a docker-compose.yml at the root of my project.
```
version: "3.8"
services:
  backend-flask:
    environment:
      FRONTEND_URL: "https://3000-${GITPOD_WORKSPACE_ID}.${GITPOD_WORKSPACE_CLUSTER_HOST}"
      BACKEND_URL: "https://4567-${GITPOD_WORKSPACE_ID}.${GITPOD_WORKSPACE_CLUSTER_HOST}"
    build: ./backend-flask
    ports:
      - "4567:4567"
    volumes:
      - ./backend-flask:/backend-flask
  frontend-react-js:
    environment:
      REACT_APP_BACKEND_URL: "https://4567-${GITPOD_WORKSPACE_ID}.${GITPOD_WORKSPACE_CLUSTER_HOST}"
    build: ./frontend-react-js
    ports:
      - "3000:3000"
    volumes:
      - ./frontend-react-js:/frontend-react-js

# the name flag is a hack to change the default prepend folder
# name when outputting the image names
networks: 
  internal-network:
    driver: bridge
    name: cruddur
   

   ```
   
   
   
   
![Cruddur_initial_homepage](./assets/Cruddur-initial-home-page.png)


## Creating a Backend the Notification feature (Backend and Frontend)


