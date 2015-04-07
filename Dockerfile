FROM node
COPY ./src /src
COPY ./views /views
RUN cd /src; npm install
ENV AWS_ACCESS_KEY_ID AKIAIBKO4SMPRFMK35OA
ENV AWS_SECRET_ACCESS_KEY 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
EXPOSE 8080
CMD ["node", "src/index.js"]
