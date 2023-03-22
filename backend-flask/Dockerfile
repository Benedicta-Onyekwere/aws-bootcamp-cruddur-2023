FROM python:3.10-slim-buster

# Set a non-root user for security reasons
RUN adduser --disabled-password --gecos '' myuser

# Add the following line to add an entry for the myuser in the /etc/passwd file
RUN echo "myuser:x:1000:1000:myuser,,,:/home/myuser:/bin/bash" >> /etc/passwd

# Inside Container
# Make a new folder inside
WORKDIR /backend-flask

RUN mkdir -p /backend-flask/node_modules \
    && chown -R myuser:myuser /backend-flask \
    && chmod -R 777 /backend-flask

# From outside container -> Inside container
# This contains libraries to be installed to run the app
COPY requirements.txt requirements.txt

# Clean up unnecessary files and packages
RUN apt-get autoremove -y && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Inside Contianer
# Install the python libraries used for the app
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy from outside container -> Inside
# . means everything in the current directory
# first period . -/backend-flask(outside container)
# second period . /backend-flask(inside container)
COPY . .

# Set Environment variables(Env Vars)
# Inside conatainer and will remain set when the container is run 
ENV FLASK_ENV=development


EXPOSE ${PORT}

USER root

# CMD(Command to run flask)
# python3 -m flask run --host=0.0.0 --port=4567
#CMD [ "python3", "-m" , "flask", "run", "--host=0.0.0.0", "--port=4567"]

# Make it executable
RUN chmod +x /backend-flask/run_flask.sh

#USER myuser

ENTRYPOINT [ "/backend-flask/run_flask.sh" ]
