docker run -t -d \
	-p 8080:8080 \
	-e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
	-e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
	-e tempPath=/mnt \
	-v $(pwd)/shared:/mnt \
	nodetranscode > containerId
