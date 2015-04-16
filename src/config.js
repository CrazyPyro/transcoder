module.exports = {
	PORT: 8080,
	publicUrl: 'http://transcoder.apps.neilfunk.com:8080',
	inputBucket: 'in.et.neilfunk.com',
	outputBucket: 'out.et.neilfunk.com',
	tempPath: process.env.tempPath || 'shared',
};
