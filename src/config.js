module.exports = {
	PORT: 8080,
	publicUrl: 'http://transcoder.apps.neilfunk.com:8080',
	inputBucket: 'in.et.neilfunk.com',
	outputBucket: 'out.et.neilfunk.com',
	tempPath: process.env.tempPath || 'shared',
	pipelineId: "1428249564917-5827pa",  // et.neilfunk.com
	presetId: "1351620000001-300040", //System preset: Audio MP3 - 128k"
};
