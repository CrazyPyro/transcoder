FROM node
MAINTAINER Neil Funk <transcoder@neilfunk.com>
COPY ./src /src
COPY ./views /views
RUN cd /src; npm install

#Need to pass on the docker run commandline:
# -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
#This doesn't work:
#ENV AWS_ACCESS_KEY_ID ${AWS_ACCESS_KEY_ID}
#ENV AWS_SECRET_ACCESS_KEY ${AWS_SECRET_ACCESS_KEY}
#ENV AWS_PROFILE transcoder

EXPOSE 8080
CMD ["node", "src/index.js"]
