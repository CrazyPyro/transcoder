docker run -t -d \
	-p 80:8080 \
	-e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
	-e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
	-e COURSERA_CLIENT_ID=$COURSERA_CLIENT_ID \
	-e COURSERA_CLIENT_SECRET=$COURSERA_CLIENT_SECRET \
	-e tempPath=/mnt \
	-v $(pwd)/shared:/mnt \
	nodetranscode > containerId
