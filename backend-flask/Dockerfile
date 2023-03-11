FROM python:3.10-slim-buster

# Set a non-root user for security reasons
RUN useradd -ms /bin/bash myuser
USER myuser

# Inside Container
# Make a new folder inside
WORKDIR /backend-flask

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

# CMD(Command to run flask)
# python3 -m flask run --host=0.0.0 --port=4567
#CMD [ "python3", "-m" , "flask", "run", "--host=0.0.0.0", "--port=4567"]

# Make it executable
RUN chmod +x /backend-flask/run_flask.sh

ENTRYPOINT [ "/backend-flask/run_flask.sh" ]
