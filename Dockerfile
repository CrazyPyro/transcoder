FROM node
MAINTAINER Neil Funk <transcoder@neilfunk.com>

RUN apt-get update && apt-get install -y \
    s3cmd

# Cache NPM dependencies. Changes to package.json will bust Docker's cache for this layer:
ADD ./src/package.json /tmp/package.json
RUN cd /tmp && npm install
RUN mkdir -p /opt/app && cp -a /tmp/node_modules /opt/app/
 
# Atop the previous layer of dependencies, add the application's code:
WORKDIR /opt/app
ADD ./src /opt/app/src
ADD ./views /opt/app/views

#Need to pass on the docker run commandline:
# -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
#This doesn't work:
#ENV AWS_ACCESS_KEY_ID ${AWS_ACCESS_KEY_ID}
#ENV AWS_SECRET_ACCESS_KEY ${AWS_SECRET_ACCESS_KEY}
#ENV AWS_PROFILE transcoder

EXPOSE 8080
CMD ["node", "src/index.js"]
