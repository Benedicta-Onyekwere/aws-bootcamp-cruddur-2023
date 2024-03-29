FROM 914347776203.dkr.ecr.us-east-1.amazonaws.com/cruddur-python:3.10-slim-buster

# Set a non-root user for security reasons
RUN adduser --disabled-password --gecos '' myuser

# Add the following line to add an entry for the myuser in the /etc/passwd file
RUN echo "myuser:x:1000:1000:myuser,,,:/home/myuser:/bin/bash" >> /etc/passwd

# Switch back to myuser
USER myuser

# Inside Container
# Make a new folder inside
WORKDIR /backend-flask

 RUN mkdir -p /backend-flask/node_modules \
     && chown -R myuser:myuser /backend-flask \
     && chmod -R 777 /backend-flask

# From outside container -> Inside container
# This contains libraries to be installed to run the app
COPY requirements.txt requirements.txt

# Change ownership of files to myuser
USER root
RUN chown -R myuser:myuser .

# Clean up unnecessary files and packages
RUN apt-get autoremove -y && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Inside Contianer
# Install the python libraries used for the app
RUN pip3 install --no-cache-dir -r requirements.txt

RUN pip install flask-cors


# Copy from outside container -> Inside
# . means everything in the current directory
# first period . -/backend-flask(outside container)
# second period . /backend-flask(inside container)
COPY . .

EXPOSE ${PORT}
ENV PYTHONUNBUFFERED=1

# CMD(Command to run flask)
# python3 -m flask run --host=0.0.0 --port=4567
CMD [ "python3", "-m" , "flask", "run", "--host=0.0.0.0", "--port=4567", "--debug"]

# Make it executable
RUN chmod +x /backend-flask/run_flask.sh

USER myuser

#ENTRYPOINT [ "/backend-flask/run_flask.sh" ]
